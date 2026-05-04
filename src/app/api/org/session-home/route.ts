import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";
import { selectHomeOrgFromCandidates } from "@/lib/pickHomeOrg";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `org-session-home:${ip}`, limit: 120, windowMs: 60 * 1000 });
  if (!allowed) return apiError("Too many requests.", 429);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return apiError("No autorizado.", 401);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return apiError("No autorizado.", 401);

    const { data: memberRows } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(200);
    if (!memberRows?.length) return apiError("Sin acceso.", 403);

    const ids = memberRows.map((m: { org_id: string }) => m.org_id);
    const { data: orgRows } = await supabaseAdmin
      .from("organizations")
      .select("id, slug, onboarding_complete, cascade_level, parent_org_id")
      .in("id", ids);
    if (!orgRows?.length) return apiError("Sin acceso.", 403);

    const candidates = orgRows
      .map((o: {
        id: string;
        slug: string | null;
        onboarding_complete: boolean | null;
        cascade_level: number | null;
        parent_org_id: string | null;
      }) => {
        if (!o.slug) return null;
        return {
          orgId: o.id,
          slug: o.slug,
          onboarding_complete: !!o.onboarding_complete,
          cascade_level: o.cascade_level ?? 0,
          parent_org_id: o.parent_org_id ?? null,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    const exceptSlug = req.nextUrl.searchParams.get("except")?.trim() || null;
    const pool = exceptSlug
      ? candidates.filter((c) => c.slug !== exceptSlug)
      : candidates;
    if (!pool.length) return apiError("Sin acceso.", 403);

    // Always honor invited_to_org when picking a fallback; clearing it on `except`
    // caused sibling tie-breaks (e.g. hr-ioss ↔ ld-f4x7) instead of the invited org.
    const home = selectHomeOrgFromCandidates(pool, user.user_metadata?.invited_to_org);
    if (!home) return apiError("Sin acceso.", 403);

    return apiOk(
      { slug: home.slug, onboarding_complete: home.onboarding_complete, orgId: home.orgId },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("org/session-home error:", e);
    return apiError("Error interno.", 500);
  }
}
