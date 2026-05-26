import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase-server";
import { selectHomeOrgFromCandidates, type HomeOrgCandidate } from "@/lib/pickHomeOrg";

type OrgEmbed = {
  slug: string;
  onboarding_complete: boolean;
  cascade_level: number;
  parent_org_id?: string | null;
};
type MembershipRow = { org_id: string; organizations: OrgEmbed | OrgEmbed[] | null };

export default async function RootPage({
  searchParams,
}: {
  searchParams: { orgId?: string | string[] };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Same membership visibility as /api/org/* (service role, scoped to this user id).
  // RLS on org_members can hide some of the user's rows in the anon server client, so
  // pickHomeOrg saw too few candidates and ignored invited_to_org → marketing.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: memberships, error: membersError } = await supabaseAdmin
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

  const orgIdFromUrl =
    typeof searchParams.orgId === "string"
      ? searchParams.orgId
      : searchParams.orgId?.[0];
  const home = selectHomeOrgFromCandidates(
    candidates,
    user.user_metadata?.invited_to_org,
    orgIdFromUrl
  );
  if (!home) redirect("/auth/signup?oauth=true");

  if (!home.onboarding_complete) {
    redirect(`/onboarding/${home.slug}`);
  }

  redirect(`/${home.slug}/dashboard`);
}
