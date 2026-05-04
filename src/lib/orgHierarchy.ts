import type { SupabaseClient } from "@supabase/supabase-js";

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
