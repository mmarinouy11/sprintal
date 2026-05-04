import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getBillingRootOrgRow } from "@/lib/orgBillingRoot";
import { isStrictAncestor } from "@/lib/orgHierarchy";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type OrgRow = Record<string, unknown> & {
  id: string;
  slug: string;
  plan: string;
  parent_org_id: string | null;
};

async function buildOrgDataResponse(
  supabaseAdmin: SupabaseClient,
  org: OrgRow,
  billingRoot: { id: string; slug: string; plan: string },
  rootPlan: string,
  meta: {
    role: string | null;
    ancestorReadOnly: boolean;
    memberContextSlug: string | null;
    memberContextName: string | null;
  }
) {
  const parentOrgPromise = org.parent_org_id
    ? supabaseAdmin
        .from("organizations")
        .select("id, name, slug, cascade_level, primary_color, plan, parent_org_id")
        .eq("id", org.parent_org_id)
        .maybeSingle()
    : Promise.resolve({ data: null as null });

  const [sprintsRes, betsRes, evidenceRes, signalChecksRes, childrenRes, parentOrgRes] = await Promise.all([
    supabaseAdmin.from("sprints").select("*").eq("org_id", org.id).order("created_at"),
    supabaseAdmin.from("bets").select("*").eq("org_id", org.id).order("created_at"),
    supabaseAdmin.from("evidence").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
    supabaseAdmin.from("signal_checks").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
    supabaseAdmin.from("organizations").select("*").eq("parent_org_id", org.id).order("cascade_level"),
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
    org,
    rootPlan,
    billingRoot,
    role: meta.role,
    sprints: sprintsRes.data || [],
    bets,
    evidence: evidenceRes.data || [],
    signalChecks: signalChecksRes.data || [],
    children: childrenRes.data || [],
    betAlignments,
    parentOrg,
    ancestorReadOnly: meta.ancestorReadOnly,
    memberContextSlug: meta.memberContextSlug,
    memberContextName: meta.memberContextName,
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

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
      .order("created_at", { ascending: false })
      .limit(1);

    const org = (orgRows?.[0] ?? null) as OrgRow | null;
    if (!org) return apiError("Org no encontrada.", 404);

    const directRole = memberByOrgId.get(org.id) ?? null;
    if (directRole) {
      const billingRoot =
        (await getBillingRootOrgRow(supabaseAdmin, org.id)) ?? {
          id: org.id,
          slug: org.slug,
          plan: org.plan,
        };
      const rootPlan = billingRoot.plan;
      return buildOrgDataResponse(supabaseAdmin, org, billingRoot, rootPlan, {
        role: directRole,
        ancestorReadOnly: false,
        memberContextSlug: null,
        memberContextName: null,
      });
    }

    const checks = await Promise.all(
      accessibleOrgIds.map(async (mid) =>
        (await isStrictAncestor(supabaseAdmin, org.id, mid)) ? mid : null
      )
    );
    const candidateIds = checks.filter((x): x is string => x != null);
    if (!candidateIds.length) {
      return apiError("Sin acceso.", 403);
    }

    const { data: candRows } = await supabaseAdmin
      .from("organizations")
      .select("id, slug, name, cascade_level")
      .in("id", candidateIds);
    const sorted = [...(candRows ?? [])].sort((a, b) => {
      const d = (b.cascade_level ?? 0) - (a.cascade_level ?? 0);
      if (d !== 0) return d;
      return (a.slug || "").localeCompare(b.slug || "");
    });
    const fromOrgRow = sorted[0];
    if (!fromOrgRow?.slug) {
      return apiError("Sin acceso.", 403);
    }

    const billingRoot =
      (await getBillingRootOrgRow(supabaseAdmin, org.id)) ?? {
        id: org.id,
        slug: org.slug,
        plan: org.plan,
      };
    const rootPlan = billingRoot.plan;

    return buildOrgDataResponse(supabaseAdmin, org, billingRoot, rootPlan, {
      role: null,
      ancestorReadOnly: true,
      memberContextSlug: fromOrgRow.slug as string,
      memberContextName: (fromOrgRow.name as string) || null,
    });

  } catch (err) {
    console.error("org/data error:", err);
    return apiError("Error interno.", 500);
  }
}
