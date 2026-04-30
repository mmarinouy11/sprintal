import PricingPageClient from "@/components/billing/PricingPageClient";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getBillingRootOrgRow } from "@/lib/orgBillingRoot";
import type { Plan } from "@/types";

/** Session is read from cookies; avoid caching a shell with isAuthenticated=false for everyone. */
export const dynamic = "force-dynamic";

function firstSearchParam(v: string | string[] | undefined): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && v[0]) return String(v[0]).trim() || null;
  return null;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  let orgId: string | null = null;
  let orgSlug: string | null = null;
  let currentPlan: Plan | null = null;

  if (user) {
    const { data: memberRows } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id);

    const orgIds = Array.from(new Set((memberRows ?? []).map((m) => m.org_id)));
    const preferredSlug =
      firstSearchParam(searchParams.org) ?? firstSearchParam(searchParams.orgSlug);

    let chosen: { id: string; slug: string } | null = null;

    if (preferredSlug && orgIds.length) {
      const { data: match } = await supabase
        .from("organizations")
        .select("id, slug")
        .eq("slug", preferredSlug)
        .in("id", orgIds)
        .limit(1)
        .maybeSingle();
      if (match) chosen = match;
    }

    if (!chosen && orgIds.length) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, slug")
        .in("id", orgIds)
        .order("created_at", { ascending: true });
      const first = orgs?.[0];
      if (first) chosen = first;
    }

    if (chosen) {
      const billingRoot = await getBillingRootOrgRow(supabase, chosen.id);
      orgId = billingRoot?.id ?? chosen.id;
      orgSlug = chosen.slug;
      currentPlan = (billingRoot?.plan as Plan | undefined) ?? null;
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
