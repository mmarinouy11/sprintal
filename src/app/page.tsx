import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get org_id
  const { data: members } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);
  const member = members?.[0];
  if (!member) redirect("/auth/signup?oauth=true");

  // Get org
  const { data: orgs } = await supabase
    .from("organizations")
    .select("slug, onboarding_complete, cascade_level")
    .eq("id", member.org_id)
    .order("cascade_level", { ascending: true })
    .limit(1);
  const org = orgs?.[0];
  if (!org) redirect("/auth/login");

  if (!org.onboarding_complete) {
    redirect(`/onboarding/${org.slug}`);
  }

  redirect(`/${org.slug}/dashboard`);
}
