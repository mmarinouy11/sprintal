/** Same shape as Supabase `user.user_metadata.invited_to_org`. */
export function invitedOrgIdFromMetadata(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  return s || undefined;
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
 * preferring `invited_to_org` when it matches a membership org id.
 *
 * If two orgs share the same `cascade_level` (data bug or legacy rows), we
 * deprioritize an org that is the `parent_org_id` of another candidate — so
 * e.g. "marketing" wins over "hr-ioss" instead of losing on slug sort.
 */
export function selectHomeOrgFromCandidates(
  candidates: HomeOrgCandidate[],
  invitedToOrgRaw: unknown
): HomeOrgCandidate | null {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => {
    const d = (b.cascade_level ?? 0) - (a.cascade_level ?? 0);
    if (d !== 0) return d;
    const aIsParent = candidates.some(
      (c) => c.orgId !== a.orgId && c.parent_org_id != null && c.parent_org_id === a.orgId
    );
    const bIsParent = candidates.some(
      (c) => c.orgId !== b.orgId && c.parent_org_id != null && c.parent_org_id === b.orgId
    );
    if (aIsParent !== bIsParent) return aIsParent ? 1 : -1;
    return (a.slug || "").localeCompare(b.slug || "");
  });
  const invitedId = invitedOrgIdFromMetadata(invitedToOrgRaw);
  let home = sorted[0];
  if (invitedId) {
    const hit = sorted.find((c) => c.orgId === invitedId);
    if (hit) home = hit;
  }
  return home;
}
