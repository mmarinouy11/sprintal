"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types";
import { useT } from "@/lib/i18n";
import { getPaddle } from "@/lib/paddle";

type Period = "monthly" | "annual";

interface PricingPageClientProps {
  orgId: string | null;
  orgSlug: string | null;
  currentPlan: Plan | null;
  isAuthenticated: boolean;
  priceIds: Record<Exclude<Plan, "trial">, { monthly: string; annual: string }>;
}

const MONTHLY_PRICE: Record<Exclude<Plan, "trial">, number> = {
  solo: 49,
  starter: 79,
  growth: 199,
  scale: 399,
};

const ORDER: Plan[] = ["trial", "solo", "starter", "growth", "scale"];

export default function PricingPageClient(props: PricingPageClientProps) {
  const { orgId, orgSlug, currentPlan, isAuthenticated, priceIds } = props;
  const t = useT("billing");
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const cards = useMemo(
    () =>
      ORDER.map((plan) => {
        if (plan === "trial") {
          return { plan, display: 0, priceId: "", annualMonthlyEquivalent: 0 };
        }
        const monthly = MONTHLY_PRICE[plan];
        const annualMonthlyEquivalent = Math.round(monthly * 0.85);
        const display = period === "monthly" ? monthly : annualMonthlyEquivalent;
        const priceId = period === "monthly" ? priceIds[plan].monthly : priceIds[plan].annual;
        return { plan, display, priceId, annualMonthlyEquivalent };
      }),
    [period, priceIds]
  );

  async function openCheckout(plan: Exclude<Plan, "trial">, priceId: string) {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    setLoadingPlan(plan);
    try {
      const paddle = await getPaddle();
      if (!paddle) return;
      const successUrl = orgSlug
        ? `${window.location.origin}/${orgSlug}/dashboard?upgraded=true`
        : `${window.location.origin}/`;
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { orgId: orgId || "" },
        settings: { successUrl },
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-page-title">{t("title")}</h1>
        <p className="text-body mt-2">{t("subtitle")}</p>
      </div>

      <div className="flex justify-center mb-8">
        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--border-mid)",
            borderRadius: 999,
            padding: 4,
            background: "var(--surface)",
            gap: 4,
          }}
        >
          <button
            type="button"
            className={period === "monthly" ? "btn-primary" : "btn-ghost"}
            onClick={() => setPeriod("monthly")}
            style={{ borderRadius: 999, padding: "8px 14px" }}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            className={period === "annual" ? "btn-primary" : "btn-ghost"}
            onClick={() => setPeriod("annual")}
            style={{ borderRadius: 999, padding: "8px 14px" }}
          >
            {t("annual")} - {t("annualSavings")}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((card) => {
          const isCurrent = currentPlan === card.plan;
          const isFeatured = card.plan === "starter";
          const isTrial = card.plan === "trial";
          return (
            <div
              key={card.plan}
              className="card"
              style={{
                padding: 16,
                border: isFeatured ? "2px solid var(--brand)" : "1px solid var(--border)",
              }}
            >
              {isFeatured && (
                <span
                  className="badge"
                  style={{
                    background: "var(--brand-lt)",
                    color: "var(--brand)",
                    borderColor: "var(--brand-mid)",
                    marginBottom: 8,
                  }}
                >
                  {t("mostPopular")}
                </span>
              )}
              <div className="text-section" style={{ textTransform: "capitalize" }}>
                {card.plan}
              </div>
              <div className="mt-1" style={{ fontSize: 28, fontWeight: 700 }}>
                ${card.display}
                <span className="text-small" style={{ marginLeft: 4 }}>
                  {isTrial ? "" : t("perMonth")}
                </span>
              </div>
              {period === "annual" && !isTrial && (
                <div className="text-small" style={{ color: "var(--scaled)", marginTop: 4 }}>
                  ${card.annualMonthlyEquivalent}{t("perMonth")} {t("billedAnnually")}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                {isCurrent ? (
                  <button className="btn-ghost w-full" type="button" disabled>
                    {t("currentPlan")}
                  </button>
                ) : isTrial ? (
                  <Link href="/auth/signup" className="btn-ghost w-full" style={{ textDecoration: "none" }}>
                    {t("getStarted")}
                  </Link>
                ) : (
                  <button
                    className={isFeatured ? "btn-primary w-full" : "btn-ghost w-full"}
                    type="button"
                    onClick={() => openCheckout(card.plan as Exclude<Plan, "trial">, card.priceId)}
                    disabled={loadingPlan === card.plan}
                  >
                    {loadingPlan === card.plan ? "..." : t("getStarted")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-8 text-small" style={{ color: "var(--t3)" }}>
        <Link href="/auth/login" style={{ color: "var(--brand)", textDecoration: "none" }}>
          /auth/login
        </Link>
      </div>
    </div>
  );
}
