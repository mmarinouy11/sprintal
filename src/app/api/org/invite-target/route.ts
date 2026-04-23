import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * After accepting an email invite, the browser has a valid session but RLS on
 * org_members may still block the server-rendered `/` page. This route uses the
 * service role to resolve the org slug for the invited orgId so we can redirect
 * straight into the app (same pattern as /api/org/data).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `invite-target:${ip}`, limit: 60, windowMs: 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = req.nextUrl.searchParams.get("orgId")?.trim();
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const { data: member, error: memError } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (memError || !member) {
      return NextResponse.json({ error: "Not a member of this organization." }, { status: 403 });
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("slug, onboarding_complete")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org?.slug) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    return NextResponse.json({
      slug: org.slug,
      onboarding_complete: !!org.onboarding_complete,
    });
  } catch (e) {
    console.error("invite-target error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
