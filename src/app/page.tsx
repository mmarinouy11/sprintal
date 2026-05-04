import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

type OrgEmbed = { slug: string; onboarding_complete: boolean; cascade_level: number };
type MembershipRow = { org_id: string; organizations: OrgEmbed | OrgEmbed[] | null };

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, organizations(slug, onboarding_complete, cascade_level)")
    .eq("user_id", user.id);

  if (!memberships?.length) redirect("/auth/signup?oauth=true");

  const orgRows = (memberships as unknown as MembershipRow[])
    .map((m) => {
      const o = m.organizations;
      return Array.isArray(o) ? o[0] : o;
    })
    .filter((o): o is OrgEmbed => !!o?.slug);

  if (!orgRows.length) redirect("/auth/signup?oauth=true");

  orgRows.sort((a, b) => (b.cascade_level ?? 0) - (a.cascade_level ?? 0));
  const home = orgRows[0];

  if (!home.onboarding_complete) {
    redirect(`/onboarding/${home.slug}`);
  }

  redirect(`/${home.slug}/dashboard`);
}
