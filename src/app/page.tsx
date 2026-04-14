import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  // Get user's org
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, organizations(slug)")
    .eq("user_id", user.id)
    .single();
  if (!member) redirect("/auth/onboarding");
  const org = member.organizations as { slug: string };
  redirect(`/${org.slug}/dashboard`);
}
