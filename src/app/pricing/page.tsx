import PricingPageClient from "@/components/billing/PricingPageClient";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Plan } from "@/types";

/** Session is read from cookies; avoid caching a shell with isAuthenticated=false for everyone. */
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = await createSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  let orgId: string | null = null;
  let orgSlug: string | null = null;
  let currentPlan: Plan | null = null;

  if (user) {
    const { data: member } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (member?.org_id) {
      orgId = member.org_id;
      const { data: org } = await supabase
        .from("organizations")
        .select("id, slug, plan")
        .eq("id", member.org_id)
        .limit(1)
        .maybeSingle();
      orgSlug = org?.slug ?? null;
      currentPlan = (org?.plan as Plan | undefined) ?? null;
    }
  }

  return (
    <PricingPageClient
      orgId={orgId}
      orgSlug={orgSlug}
      currentPlan={currentPlan}
      isAuthenticated={!!user}
      priceIds={{
        solo: {
          monthly: process.env.PADDLE_PRICE_SOLO_MONTHLY || "",
          annual: process.env.PADDLE_PRICE_SOLO_ANNUAL || "",
        },
        starter: {
          monthly: process.env.PADDLE_PRICE_STARTER_MONTHLY || "",
          annual: process.env.PADDLE_PRICE_STARTER_ANNUAL || "",
        },
        growth: {
          monthly: process.env.PADDLE_PRICE_GROWTH_MONTHLY || "",
          annual: process.env.PADDLE_PRICE_GROWTH_ANNUAL || "",
        },
        scale: {
          monthly: process.env.PADDLE_PRICE_SCALE_MONTHLY || "",
          annual: process.env.PADDLE_PRICE_SCALE_ANNUAL || "",
        },
      }}
    />
  );
}
