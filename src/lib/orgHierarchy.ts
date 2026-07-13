import type { SupabaseClient } from "@supabase/supabase-js";

/** Walk `parent_org_id` until the root (no parent). Returns null if chain breaks. */
export async function getOrgRootId(
  supabase: SupabaseClient,
  orgId: string
): Promise<string | null> {
  let currentId = orgId;
  const seen = new Set<string>();
  for (let i = 0; i < 32; i++) {
    if (seen.has(currentId)) return null;
    seen.add(currentId);
    const { data } = await supabase
      .from("organizations")
      .select("id, parent_org_id")
      .eq("id", currentId)
      .maybeSingle();
    const row = data as { id: string; parent_org_id: string | null } | null;
    if (!row) return null;
    if (!row.parent_org_id) return row.id;
    currentId = row.parent_org_id;
  }
  return null;
}

/** Same L1 billing tree (shared root org). */
export async function shareOrgRoot(
  supabase: SupabaseClient,
  orgIdA: string,
  orgIdB: string
): Promise<boolean> {
  const [rootA, rootB] = await Promise.all([
    getOrgRootId(supabase, orgIdA),
    getOrgRootId(supabase, orgIdB),
  ]);
  return !!rootA && rootA === rootB;
}

/** True if `ancestorId` is a strict ancestor of `descendantId` in parent_org_id chain. */
export async function isStrictAncestor(
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

/** Count all descendant orgs under `rootOrgId` (excludes the root). */
export async function countSubOrgsUnderRoot(
  supabase: SupabaseClient,
  rootOrgId: string
): Promise<number> {
  let count = 0;
  let frontier = [rootOrgId];
  const seen = new Set<string>([rootOrgId]);
  for (let i = 0; i < 4; i++) {
    if (!frontier.length) break;
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .in("parent_org_id", frontier);
    const children = (data ?? [])
      .map((r) => (r as { id: string }).id)
      .filter((id) => !seen.has(id));
    for (const id of children) seen.add(id);
    count += children.length;
    frontier = children;
  }
  return count;
}
