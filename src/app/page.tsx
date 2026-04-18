import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get org_id first
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/auth/login");

  // Then get org separately
  const { data: org } = await supabase
    .from("organizations")
    .select("slug, onboarding_complete")
    .eq("id", member.org_id)
    .single();

  if (!org) redirect("/auth/login");

  if (!org.onboarding_complete) {
    redirect(`/${org.slug}/onboarding`);
  }

  redirect(`/${org.slug}/dashboard`);
}
