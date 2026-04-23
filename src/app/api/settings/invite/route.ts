import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orgId, email, role } = await req.json();

    // Verify caller has admin rights
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id)
      .limit(1).maybeSingle();

    if (!member || !["owner", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Invite via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { invited_to_org: orgId, invited_role: role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?orgId=${orgId}&role=${role}`,
    });

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 });

    // Pre-create org_member record
    await supabaseAdmin.from("org_members").upsert({
      org_id: orgId,
      user_id: inviteData.user.id,
      role,
      full_name: email.split("@")[0],
    }, { onConflict: "org_id,user_id" });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
