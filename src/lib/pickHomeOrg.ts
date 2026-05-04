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
};

/**
 * Picks the dashboard org for a logged-in user (deepest cascade, then slug),
 * preferring `invited_to_org` when it matches a membership org id.
 */
export function selectHomeOrgFromCandidates(
  candidates: HomeOrgCandidate[],
  invitedToOrgRaw: unknown
): HomeOrgCandidate | null {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => {
    const d = (b.cascade_level ?? 0) - (a.cascade_level ?? 0);
    if (d !== 0) return d;
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
