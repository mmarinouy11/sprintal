import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getBillingRootOrgRow } from "@/lib/orgBillingRoot";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** True if `ancestorId` is a strict ancestor of `descendantId` in parent_org_id chain. */
async function isStrictAncestor(
  supabase: SupabaseClient,
  ancestorId: string,
  descendantId: string
): Promise<boolean> {
  if (ancestorId === descendantId) return false;
  let current: string = descendantId;
  const seen = new Set<string>();
  for (;;) {
    if (seen.has(current)) break;
    seen.add(current);
    const query = await supabase
      .from("organizations")
      .select("parent_org_id")
      .eq("id", current)
      .maybeSingle();
    const parentId: string | null =
      (query.data as { parent_org_id: string | null } | null)?.parent_org_id ?? null;
    if (!parentId) return false;
    if (parentId === ancestorId) return true;
    current = parentId;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `org-ancestor-preview:${ip}`, limit: 300, windowMs: 60 * 1000 });
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

    const slug = req.nextUrl.searchParams.get("slug");
    const fromSlug = req.nextUrl.searchParams.get("from");
    if (!slug || !fromSlug) return apiError("slug y from requeridos.", 400);
    if (slug === fromSlug) return apiError("Invalid.", 400);

    const { data: memberRows } = await supabaseAdmin
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .limit(200);
    if (!memberRows?.length) return apiError("Sin acceso.", 403);

    const memberByOrgId = new Map(memberRows.map((m: { org_id: string; role: string }) => [m.org_id, m.role]));

    const { data: fromOrgRow } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("slug", fromSlug)
      .limit(1)
      .maybeSingle();
    if (!fromOrgRow || !memberByOrgId.has(fromOrgRow.id)) {
      return apiError("Sin acceso.", 403);
    }

    const { data: targetOrg } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (!targetOrg) return apiError("Org no encontrada.", 404);

    const ok = await isStrictAncestor(supabaseAdmin, targetOrg.id, fromOrgRow.id);
    if (!ok) return apiError("Sin acceso.", 403);

    const billingRoot =
      (await getBillingRootOrgRow(supabaseAdmin, targetOrg.id)) ?? {
        id: targetOrg.id as string,
        slug: targetOrg.slug as string,
        plan: targetOrg.plan as string,
      };
    const rootPlan = billingRoot.plan;

    const parentOrgPromise = targetOrg.parent_org_id
      ? supabaseAdmin
          .from("organizations")
          .select("id, name, slug, cascade_level, primary_color, plan, parent_org_id")
          .eq("id", targetOrg.parent_org_id)
          .maybeSingle()
      : Promise.resolve({ data: null as null });

    const [sprintsRes, betsRes, evidenceRes, signalChecksRes, childrenRes, parentOrgRes] = await Promise.all([
      supabaseAdmin.from("sprints").select("*").eq("org_id", targetOrg.id).order("created_at"),
      supabaseAdmin.from("bets").select("*").eq("org_id", targetOrg.id).order("created_at"),
      supabaseAdmin.from("evidence").select("*").eq("org_id", targetOrg.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("signal_checks").select("*").eq("org_id", targetOrg.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("organizations").select("*").eq("parent_org_id", targetOrg.id).order("cascade_level"),
      parentOrgPromise,
    ]);

    const bets = betsRes.data || [];
    let betAlignments: unknown[] = [];
    if (bets.length > 0) {
      const { data: alData } = await supabaseAdmin
        .from("bet_alignments").select("*")
        .in("child_bet_id", bets.map((b: { id: string }) => b.id));
      betAlignments = alData || [];
    }

    const parentOrg = parentOrgRes.data ?? null;

    return apiOk({
      org: targetOrg,
      rootPlan,
      billingRoot,
      role: null,
      sprints: sprintsRes.data || [],
      bets,
      evidence: evidenceRes.data || [],
      signalChecks: signalChecksRes.data || [],
      children: childrenRes.data || [],
      betAlignments,
      parentOrg,
      ancestorReadOnly: true,
      memberContextSlug: fromSlug,
      memberContextName: fromOrgRow.name as string,
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("org/ancestor-preview error:", err);
    return apiError("Error interno.", 500);
  }
}
