import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function BillingRedirectPage() {
  const supabase = await createSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/auth/login");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (!member?.org_id) redirect("/auth/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", member.org_id)
    .limit(1)
    .maybeSingle();

  if (!org?.slug) redirect("/auth/login");
  redirect(`/${org.slug}/billing`);
}
