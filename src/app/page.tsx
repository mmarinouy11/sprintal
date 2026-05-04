import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { invitedOrgIdFromMetadata, selectHomeOrgFromCandidates, type HomeOrgCandidate } from "@/lib/pickHomeOrg";
import { isSprintalServerDebug, sprintalServerDebug, sprintalShortId } from "@/lib/debugOrgLoad";

type OrgEmbed = {
  slug: string;
  onboarding_complete: boolean;
  cascade_level: number;
  parent_org_id?: string | null;
};
type MembershipRow = { org_id: string; organizations: OrgEmbed | OrgEmbed[] | null };

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: memberships, error: membersError } = await supabase
    .from("org_members")
    .select("org_id, organizations(slug, onboarding_complete, cascade_level, parent_org_id)")
    .eq("user_id", user.id);

  if (membersError || !memberships?.length) redirect("/auth/signup?oauth=true");

  const candidates: HomeOrgCandidate[] = (memberships as unknown as MembershipRow[])
    .map((m) => {
      const o = m.organizations;
      const org = Array.isArray(o) ? o[0] : o;
      if (!org?.slug) return null;
      return {
        orgId: m.org_id,
        slug: org.slug,
        onboarding_complete: org.onboarding_complete,
        cascade_level: org.cascade_level,
        parent_org_id: org.parent_org_id ?? null,
      };
    })
    .filter((r): r is HomeOrgCandidate => r != null);

  if (!candidates.length) redirect("/auth/signup?oauth=true");

  const home = selectHomeOrgFromCandidates(candidates, user.user_metadata?.invited_to_org);
  if (isSprintalServerDebug()) {
    sprintalServerDebug("api", "page / home pick", {
      userId: sprintalShortId(user.id),
      candidateSlugs: candidates.map((c) => c.slug),
      invitedNorm: invitedOrgIdFromMetadata(user.user_metadata?.invited_to_org),
      pickedSlug: home?.slug ?? null,
    });
  }
  if (!home) redirect("/auth/signup?oauth=true");

  if (!home.onboarding_complete) {
    redirect(`/onboarding/${home.slug}`);
  }

  redirect(`/${home.slug}/dashboard`);
}
