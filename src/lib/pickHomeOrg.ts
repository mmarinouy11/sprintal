/** Same shape as Supabase `user.user_metadata.invited_to_org`. */
export function invitedOrgIdFromMetadata(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  return s || undefined;
}

/** Case-insensitive UUID compare (invite metadata vs org_members ids). */
export function orgIdsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export type HomeOrgCandidate = {
  orgId: string;
  slug: string;
  onboarding_complete: boolean;
  cascade_level: number;
  /** Used to break ties: prefer child org over parent when `cascade_level` matches. */
  parent_org_id: string | null;
};

/**
 * Picks the dashboard org for a logged-in user (deepest cascade, then slug),
 * preferring invite target when it matches a membership org id:
 * `user_metadata.invited_to_org`, then `?orgId=` from the invite/callback URL.
 *
 * If two orgs share the same `cascade_level` (data bug or legacy rows), we
 * deprioritize an org that is the `parent_org_id` of another candidate — so
 * e.g. "marketing" wins over "hr-ioss" instead of losing on slug sort.
 */
export function selectHomeOrgFromCandidates(
  candidates: HomeOrgCandidate[],
  invitedToOrgFromMetadataRaw: unknown,
  inviteOrgIdFromUrlRaw?: unknown
): HomeOrgCandidate | null {
  if (!candidates.length) return null;
  const preferredId =
    invitedOrgIdFromMetadata(invitedToOrgFromMetadataRaw) ??
    invitedOrgIdFromMetadata(inviteOrgIdFromUrlRaw);
  if (preferredId) {
    const hit = candidates.find((c) => orgIdsEqual(c.orgId, preferredId));
    if (hit) return hit;
  }
  const sorted = [...candidates].sort((a, b) => {
    // Prefer orgs that finished onboarding so returning Google users land on dashboard
    if (a.onboarding_complete !== b.onboarding_complete) {
      return a.onboarding_complete ? -1 : 1;
    }
    const d = Number(b.cascade_level ?? 0) - Number(a.cascade_level ?? 0);
    if (!Number.isFinite(d) || d !== 0) return Number.isFinite(d) ? d : 0;
    const aIsParent = candidates.some(
      (c) => c.orgId !== a.orgId && c.parent_org_id != null && c.parent_org_id === a.orgId
    );
    const bIsParent = candidates.some(
      (c) => c.orgId !== b.orgId && c.parent_org_id != null && c.parent_org_id === b.orgId
    );
    if (aIsParent !== bIsParent) return aIsParent ? 1 : -1;
    return (a.slug || "").localeCompare(b.slug || "");
  });
  return sorted[0] ?? null;
}
