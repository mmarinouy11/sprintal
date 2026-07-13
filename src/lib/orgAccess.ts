import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgRootId, isStrictAncestor } from "@/lib/orgHierarchy";

/** org_members.role can be null/empty; legacy schema used default "member". */
export function roleForOrgDataApi(raw: unknown): string {
  if (raw == null) return "viewer";
  const s = String(raw).trim();
  if (!s) return "viewer";
  const lower = s.toLowerCase();
  if (lower === "owner" || lower === "admin" || lower === "editor" || lower === "viewer") return lower;
  return "viewer";
}

export function isRootOwnerOrAdminRole(role: string | null | undefined): boolean {
  if (role == null) return false;
  const lower = String(role).trim().toLowerCase();
  return lower === "owner" || lower === "admin";
}

/** Whether the user is owner/admin of the L1 root for `orgId` (from membership map). */
export async function getRootOwnerAdminFromMemberships(
  supabase: SupabaseClient,
  orgId: string,
  memberByOrgId: Map<string, string>
): Promise<{ isRootOwnerAdmin: boolean; rootRole: string | null; rootOrgId: string | null }> {
  const rootOrgId = await getOrgRootId(supabase, orgId);
  if (!rootOrgId) {
    return { isRootOwnerAdmin: false, rootRole: null, rootOrgId: null };
  }
  const rawRole = memberByOrgId.get(rootOrgId) ?? null;
  const rootRole = rawRole != null ? roleForOrgDataApi(rawRole) : null;
  return {
    isRootOwnerAdmin: isRootOwnerOrAdminRole(rootRole),
    rootRole,
    rootOrgId,
  };
}

/** True if `orgId` is the root or a descendant of `rootOrgId` in the org tree. */
export async function isInOrgTree(
  supabase: SupabaseClient,
  rootOrgId: string,
  orgId: string
): Promise<boolean> {
  if (rootOrgId === orgId) return true;
  return isStrictAncestor(supabase, rootOrgId, orgId);
}
