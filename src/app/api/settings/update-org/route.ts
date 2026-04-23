import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      orgId?: string;
      name?: string;
      primaryColor?: string;
    };

    const orgId = body.orgId?.trim();
    const name = body.name?.trim();
    const primaryColor = body.primaryColor?.trim();
    if (!orgId || !name || !primaryColor) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ name, primary_color: primaryColor })
      .eq("id", orgId)
      .select("id, name, primary_color")
      .limit(1)
      .maybeSingle();

    if (updateError || !updatedOrg) {
      return NextResponse.json({ error: "Unable to update organization." }, { status: 500 });
    }

    return NextResponse.json({ org: updatedOrg });
  } catch {
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
