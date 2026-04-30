import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Walk `parent_org_id` to the L1 org. Subscription / Paddle fields live on this row.
 * Do not rely on `org_path` (format can break rootPlan in API).
 */
export async function getBillingRootOrgRow(
  supabase: SupabaseClient,
  startOrgId: string
): Promise<{ id: string; slug: string; plan: string } | null> {
  const { data: start } = await supabase
    .from("organizations")
    .select("id, slug, plan, parent_org_id")
    .eq("id", startOrgId)
    .limit(1)
    .maybeSingle();
  if (!start) return null;

  let row = start as {
    id: string;
    slug: string;
    plan: string;
    parent_org_id: string | null;
  };
  const seen = new Set<string>([row.id]);

  while (row.parent_org_id) {
    if (seen.has(row.parent_org_id)) break;
    seen.add(row.parent_org_id);
    const { data: parent } = await supabase
      .from("organizations")
      .select("id, slug, plan, parent_org_id")
      .eq("id", row.parent_org_id)
      .limit(1)
      .maybeSingle();
    if (!parent) break;
    row = parent as typeof row;
  }

  return { id: row.id, slug: row.slug, plan: row.plan };
}
