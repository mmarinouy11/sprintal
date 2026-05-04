import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

type OrgEmbed = { slug: string; onboarding_complete: boolean; cascade_level: number };
type MembershipRow = { org_id: string; organizations: OrgEmbed | OrgEmbed[] | null };

function invitedOrgIdFromMetadata(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  return s || undefined;
}

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: memberships, error: membersError } = await supabase
    .from("org_members")
    .select("org_id, organizations(slug, onboarding_complete, cascade_level)")
    .eq("user_id", user.id);

  if (membersError || !memberships?.length) redirect("/auth/signup?oauth=true");

  type Row = OrgEmbed & { id: string; membershipOrgId: string };
  const orgRows: Row[] = (memberships as unknown as MembershipRow[])
    .map((m) => {
      const o = m.organizations;
      const org = Array.isArray(o) ? o[0] : o;
      if (!org?.slug) return null;
      return {
        slug: org.slug,
        onboarding_complete: org.onboarding_complete,
        cascade_level: org.cascade_level,
        id: m.org_id,
        membershipOrgId: m.org_id,
      };
    })
    .filter((r): r is Row => r != null);

  if (!orgRows.length) redirect("/auth/signup?oauth=true");

  orgRows.sort((a, b) => {
    const d = (b.cascade_level ?? 0) - (a.cascade_level ?? 0);
    if (d !== 0) return d;
    return (a.slug || "").localeCompare(b.slug || "");
  });

  const invitedId = invitedOrgIdFromMetadata(user.user_metadata?.invited_to_org);
  let home = orgRows[0];
  if (invitedId) {
    const hit = orgRows.find(
      (r) => r.membershipOrgId === invitedId || r.id === invitedId
    );
    if (hit) home = hit;
  }

  if (!home.onboarding_complete) {
    redirect(`/onboarding/${home.slug}`);
  }

  redirect(`/${home.slug}/dashboard`);
}
