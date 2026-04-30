"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types";
import { useT } from "@/lib/i18n";
import { getPaddle, getPaddleJsEnvironment } from "@/lib/paddle";
import { supabase } from "@/lib/supabase";

type Period = "monthly" | "annual";

interface PricingPageClientProps {
  orgId: string | null;
  orgSlug: string | null;
  currentPlan: Plan | null;
  isAuthenticated: boolean;
  priceIds: Record<Exclude<Plan, "trial">, { monthly: string; annual: string }>;
}

type PlanCard = {
  key: "free" | Exclude<Plan, "trial">;
  label: string;
  monthly: number;
  annualEquivalent: number | null;
  tagline: string;
  cta: string;
};

const PLAN_CARDS: PlanCard[] = [
  {
    key: "free",
    label: "Free",
    monthly: 0,
    annualEquivalent: null,
    tagline: "Trial 90 días. Sin tarjeta de crédito.",
    cta: "Empezar gratis",
  },
  {
    key: "solo",
    label: "Solo",
    monthly: 49,
    annualEquivalent: 35,
    tagline: "ELT permanente. Sin límite de tiempo.",
    cta: "Elegir Solo",
  },
  {
    key: "starter",
    label: "Starter",
    monthly: 79,
    annualEquivalent: 67,
    tagline: "ELT + áreas directas activadas.",
    cta: "Elegir Starter",
  },
  {
    key: "growth",
    label: "Growth",
    monthly: 199,
    annualEquivalent: 169,
    tagline: "Cascada completa hasta L3.",
    cta: "Elegir Growth",
  },
  {
    key: "scale",
    label: "Scale",
    monthly: 399,
    annualEquivalent: 339,
    tagline: "Enterprise. Governance y API.",
    cta: "Elegir Scale",
  },
];

const CHECK = "✓";
const DASH = "—";

export default function PricingPageClient(props: PricingPageClientProps) {
  const { orgId, orgSlug, currentPlan, isAuthenticated, priceIds } = props;
  const t = useT("billing");
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<Exclude<Plan, "trial"> | null>(null);

  /**
   * `isAuthenticated` comes from the server RSC (`getUser()` + cookies at request time).
   * The browser session can be valid even when that prop is false (navigation timing, cookie
   * sync, or a cached static payload). Checkout must use `getSession()` at interaction time.
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void supabase.auth.getSession().then(({ data }) => {
      console.debug("[pricing] render auth snapshot", {
        propIsAuthenticated: isAuthenticated,
        clientHasSession: !!data.session,
        userId: data.session?.user?.id ?? null,
      });
    });
  }, [isAuthenticated]);

  const cards = useMemo(
    () =>
      PLAN_CARDS.map((card) => {
        if (card.key === "free") {
          return { ...card, display: 0, priceId: "" };
        }
        const annualMonthlyEquivalent = card.annualEquivalent ?? card.monthly;
        const display = period === "monthly" ? card.monthly : annualMonthlyEquivalent;
        const priceId = period === "monthly" ? priceIds[card.key].monthly : priceIds[card.key].annual;
        return { ...card, display, priceId };
      }),
    [period, priceIds]
  );

  async function openCheckout(plan: Exclude<Plan, "trial">, priceId: string) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (process.env.NODE_ENV === "development") {
      console.debug("[pricing] checkout click auth", {
        propIsAuthenticated: isAuthenticated,
        clientHasSession: !!session,
        sessionError: sessionError?.message ?? null,
        userId: session?.user?.id ?? null,
      });
    }

    if (!session) {
      router.push(`/auth/signup?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period)}`);
      return;
    }

    if (!priceId?.startsWith("pri_")) {
      console.error("[pricing] Invalid or missing Paddle priceId — check env PADDLE_PRICE_* vars", { plan, priceId });
      return;
    }

    let checkoutOrgId = orgId;
    let checkoutOrgSlug = orgSlug;
    if (!checkoutOrgId && session.user.id) {
      const { data: memberRow } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (memberRow?.org_id) {
        checkoutOrgId = memberRow.org_id;
        if (!checkoutOrgSlug) {
          const { data: orgRow } = await supabase
            .from("organizations")
            .select("slug")
            .eq("id", memberRow.org_id)
            .limit(1)
            .maybeSingle();
          checkoutOrgSlug = orgRow?.slug ?? null;
        }
      }
    }

    setLoadingPlan(plan);
    try {
      const paddle = await getPaddle();
      if (!paddle) return;
      const successUrl = checkoutOrgSlug
        ? `${window.location.origin}/${checkoutOrgSlug}/dashboard?upgraded=true`
        : `${window.location.origin}/`;

      // Paddle rejects invalid customData; omit unless we have a real org id for webhooks.
      // Overlay: set displayMode + one-page variant per Paddle Billing docs.
      const payload: Parameters<typeof paddle.Checkout.open>[0] = {
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl,
        },
      };
      if (checkoutOrgId) {
        payload.customData = { orgId: checkoutOrgId };
      } else if (process.env.NODE_ENV === "development") {
        console.warn("[pricing] No orgId — checkout will open but webhook cannot match org until user has membership");
      }
      const email = session.user.email?.trim();
      if (email) {
        payload.customer = { email };
      }

      // eslint-disable-next-line no-console -- intentional diagnostics (see NEXT_PUBLIC_PADDLE_DEBUG)
      console.info("[pricing] Paddle.Checkout.open", {
        environment: getPaddleJsEnvironment(),
        plan,
        period,
        priceIdPrefix: `${priceId.slice(0, 16)}…`,
        hasOrgId: !!checkoutOrgId,
        orgSlug: checkoutOrgSlug,
        successUrl,
        hasCustomerEmail: !!email,
        NEXT_PUBLIC_PADDLE_DEBUG: process.env.NEXT_PUBLIC_PADDLE_DEBUG ?? "(unset)",
      });

      paddle.Checkout.open(payload);
    } finally {
      setLoadingPlan(null);
    }
  }

  function renderCell(value: string) {
    if (value === CHECK) return <span style={{ color: "#22C55E", fontWeight: 700 }}>{CHECK}</span>;
    if (value === DASH) return <span style={{ color: "var(--t3)" }}>{DASH}</span>;
    return value;
  }

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
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

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {cards.map((card) => {
          const isCurrent =
            (card.key === "free" && currentPlan === "trial") ||
            (card.key !== "free" && currentPlan === card.key);
          const isFeatured = card.key === "growth";
          const isFree = card.key === "free";
          return (
            <div
              key={card.key}
              className="card"
              style={{
                padding: 16,
                border: isFeatured ? "2px solid #5C6AC4" : "1px solid var(--border)",
              }}
            >
              {isFeatured && (
                <span
                  className="badge"
                  style={{
                    background: "rgba(92,106,196,0.12)",
                    color: "#3f4a93",
                    borderColor: "rgba(92,106,196,0.3)",
                    marginBottom: 8,
                  }}
                >
                  Más popular
                </span>
              )}
              <div className="text-section">
                {card.label}
              </div>
              <div className="mt-1" style={{ fontSize: 28, fontWeight: 700 }}>
                ${card.display}
                <span className="text-small" style={{ marginLeft: 4 }}>
                  {isFree ? "" : "/mes"}
                </span>
              </div>
              {period === "annual" && !isFree && (
                <div className="text-small" style={{ color: "var(--scaled)", marginTop: 4 }}>
                  ${card.annualEquivalent}/mes facturado anual
                </div>
              )}
              <div className="text-small mt-2" style={{ color: "var(--t2)", minHeight: 36 }}>
                {card.tagline}
              </div>
              <div style={{ marginTop: 16 }}>
                {isCurrent ? (
                  <button className="btn-ghost w-full" type="button" disabled>
                    {t("currentPlan")}
                  </button>
                ) : isFree ? (
                  <Link href="/auth/signup" className="btn-ghost w-full" style={{ textDecoration: "none" }}>
                    {card.cta}
                  </Link>
                ) : (
                  <button
                    className={isFeatured ? "btn-primary w-full" : "btn-ghost w-full"}
                    type="button"
                    onClick={() => openCheckout(card.key as Exclude<Plan, "trial">, card.priceId)}
                    disabled={loadingPlan === card.key}
                  >
                    {loadingPlan === card.key ? "..." : card.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 900, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--border)" }} />
              <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Free</th>
              <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Solo</th>
              <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Starter</th>
              <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "#5C6AC4" }}>Growth</th>
              <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Scale</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} style={{ background: "var(--raised)", fontWeight: 700, padding: "8px 12px" }}>Estructura</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Profundidad</td><td style={{ textAlign: "center" }}>L1</td><td style={{ textAlign: "center" }}>L1</td><td style={{ textAlign: "center" }}>L1+L2</td><td style={{ textAlign: "center" }}>L1→L3</td><td style={{ textAlign: "center" }}>L1→L4</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Orgs activas máx.</td><td style={{ textAlign: "center" }}>1</td><td style={{ textAlign: "center" }}>9</td><td style={{ textAlign: "center" }}>9</td><td style={{ textAlign: "center" }}>73</td><td style={{ textAlign: "center" }}>Ilimitadas</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Editores</td><td style={{ textAlign: "center" }}>orgs×2 en todos</td><td style={{ textAlign: "center" }}>orgs×2</td><td style={{ textAlign: "center" }}>orgs×2</td><td style={{ textAlign: "center" }}>orgs×2</td><td style={{ textAlign: "center" }}>Ilimitados</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Viewers</td><td colSpan={5} style={{ textAlign: "center", color: "var(--t2)" }}>Ilimitados en todos los planes</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Cascade alignment</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>

            <tr><td colSpan={6} style={{ background: "var(--raised)", fontWeight: 700, padding: "8px 12px" }}>Sprints y bets</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Strategic bets activos</td><td style={{ textAlign: "center" }}>Hasta 5</td><td style={{ textAlign: "center" }}>Ilimitados</td><td style={{ textAlign: "center" }}>Ilimitados</td><td style={{ textAlign: "center" }}>Ilimitados</td><td style={{ textAlign: "center" }}>Ilimitados</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Close Sprint</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Historial de sprints</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>Read-only</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Signal checks + reviews</td><td colSpan={5} style={{ textAlign: "center", color: "var(--t2)" }}>Incluidos en todos los planes</td></tr>

            <tr><td colSpan={6} style={{ background: "var(--raised)", fontWeight: 700, padding: "8px 12px" }}>AI Coach</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Formulation Coach</td><td colSpan={5} style={{ textAlign: "center", color: "var(--t2)" }}>Incluido en todos los planes (EN/ES/PT)</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Strategic Coach</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Créditos mensuales</td><td style={{ textAlign: "center" }}>50</td><td style={{ textAlign: "center" }}>300</td><td style={{ textAlign: "center" }}>600</td><td style={{ textAlign: "center" }}>1,200</td><td style={{ textAlign: "center" }}>3,000</td></tr>

            <tr><td colSpan={6} style={{ background: "var(--raised)", fontWeight: 700, padding: "8px 12px" }}>Plataforma</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Export CSV</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Export PDF board-ready</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Branding personalizado</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>Color</td><td style={{ textAlign: "center" }}>Color + logo</td><td style={{ textAlign: "center" }}>Completo</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>SSO / API</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>

            <tr><td colSpan={6} style={{ background: "var(--raised)", fontWeight: 700, padding: "8px 12px" }}>Soporte</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Base de conocimiento</td><td colSpan={5} style={{ textAlign: "center", color: "var(--t2)" }}>Incluida en todos los planes</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Email support</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>48hs</td><td style={{ textAlign: "center" }}>48hs</td><td style={{ textAlign: "center" }}>24hs</td><td style={{ textAlign: "center" }}>Priority</td></tr>
            <tr><td style={{ padding: "8px 12px", color: "var(--t2)" }}>Onboarding dedicado</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(DASH)}</td><td style={{ textAlign: "center" }}>{renderCell(CHECK)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
