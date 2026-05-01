import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getBillingRootOrgRow } from "@/lib/orgBillingRoot";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limit: 300 requests per IP per minute (generous for normal use)
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `org-data:${ip}`, limit: 300, windowMs: 60 * 1000 });
  if (!allowed) {
    return apiError("Too many requests.", 429);
  }

  // Create fresh client per request — avoids stale connection cache
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

    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return apiError("slug requerido.", 400);

    // Resolve memberships first, then filter org by slug within accessible org IDs.
    const { data: memberRows } = await supabaseAdmin
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .limit(200);
    if (!memberRows?.length) return apiError("Sin acceso.", 403);

    const memberByOrgId = new Map(memberRows.map((m: { org_id: string; role: string }) => [m.org_id, m.role]));
    const accessibleOrgIds = Array.from(memberByOrgId.keys());

    const { data: orgRows } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .in("id", accessibleOrgIds)
      .order("created_at", { ascending: false })
      .limit(1);

    const org = orgRows?.[0] ?? null;
    if (!org) return apiError("Org no encontrada.", 404);
    const role = memberByOrgId.get(org.id);
    if (!role) return apiError("Sin acceso.", 403);

    const billingRoot =
      (await getBillingRootOrgRow(supabaseAdmin, org.id)) ?? {
        id: org.id as string,
        slug: org.slug as string,
        plan: org.plan as string,
      };
    const rootPlan = billingRoot.plan;

    // Load everything in parallel
    const [sprintsRes, betsRes, evidenceRes, signalChecksRes, childrenRes] = await Promise.all([
      supabaseAdmin.from("sprints").select("*").eq("org_id", org.id).order("created_at"),
      supabaseAdmin.from("bets").select("*").eq("org_id", org.id).order("created_at"),
      supabaseAdmin.from("evidence").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("signal_checks").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("organizations").select("*").eq("parent_org_id", org.id).order("cascade_level"),
    ]);

    const bets = betsRes.data || [];
    let betAlignments: unknown[] = [];
    if (bets.length > 0) {
      const { data: alData } = await supabaseAdmin
        .from("bet_alignments").select("*")
        .in("child_bet_id", bets.map((b: { id: string }) => b.id));
      betAlignments = alData || [];
    }

    return apiOk({
      org,
      rootPlan,
      billingRoot,
      role,
      sprints: sprintsRes.data || [],
      bets,
      evidence: evidenceRes.data || [],
      signalChecks: signalChecksRes.data || [],
      children: childrenRes.data || [],
      betAlignments,
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });

  } catch (err) {
    console.error("org/data error:", err);
    return apiError("Error interno.", 500);
  }
}
