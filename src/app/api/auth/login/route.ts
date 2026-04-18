import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId requerido." }, { status: 400 });

    // Get user's org memberships using service_role — bypasses RLS
    const { data: members } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId);

    if (!members?.length) {
      return NextResponse.json({ error: "No se encontró la organización." }, { status: 404 });
    }

    // Get all orgs, prefer L1
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("slug, onboarding_complete, cascade_level")
      .in("id", members.map(m => m.org_id))
      .order("cascade_level", { ascending: true });

    const org = orgs?.[0];
    if (!org) return NextResponse.json({ error: "No se encontró la organización." }, { status: 404 });

    return NextResponse.json({ slug: org.slug, onboarding_complete: org.onboarding_complete });

  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
