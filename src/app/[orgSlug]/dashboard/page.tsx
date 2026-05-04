"use client";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import MetricsBar from "@/components/dashboard/MetricsBar";
import PortfolioDonut from "@/components/dashboard/PortfolioDonut";
import ActiveBetsTable from "@/components/dashboard/ActiveBetsTable";
import DecisionFocus from "@/components/dashboard/DecisionFocus";
import PendingUpdates from "@/components/dashboard/PendingUpdates";
import SprintCard from "@/components/sprints/SprintCard";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useT } from "@/lib/i18n";
import RollupDashboard from "@/components/dashboard/RollupDashboard";
import OwnedBetsSection from "@/components/dashboard/OwnedBetsSection";
import PortfolioSemanticSlideover from "@/components/dashboard/PortfolioSemanticSlideover";
import SemanticCoachPanel from "@/components/coach/SemanticCoachPanel";
import { effectiveCoachPlan } from "@/lib/coach/effectiveCoachPlan";
import { COACH_LIMITS, type Plan } from "@/types";
import { useParams } from "next/navigation";
import { formatPlanName } from "@/lib/billing";
import { orgLoadDebug } from "@/lib/debugOrgLoad";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="section-label">{label}</div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const orgSlugParam = (Array.isArray(params.orgSlug) ? params.orgSlug[0] : params.orgSlug) ?? "";
  const { org, bets, sprints, rootPlan } = useStore();
  const displayPlanForBanner = (rootPlan as Plan) || org?.plan;
  const planForCoach = effectiveCoachPlan(rootPlan, org?.plan);
  const t = useT("dashboard");
  const tCoach = useT("coach");
  const [portfolioSlideOpen, setPortfolioSlideOpen] = useState(false);
  const [portfolioRunNonce, setPortfolioRunNonce] = useState(0);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [riskFilter, setRiskFilter] = useState(false);
  const activeSprint = sprints.find((s) => s.status === "Active");
  const activeBets = useMemo(
    () => bets.filter((b) => b.sprint_id === activeSprint?.id && b.status === "Active"),
    [bets, activeSprint?.id]
  );
  const betsWithHypothesis = useMemo(
    () => activeBets.filter((b) => (b.hypothesis || "").trim().length > 0),
    [activeBets]
  );
  const portfolioEligible = betsWithHypothesis.length >= 3;
  const semanticPlanOk = (COACH_LIMITS[planForCoach]?.semantic ?? 0) !== 0;
  const showPortfolioRow = !!org && activeBets.length > 0;

  const portfolioOpenDisabled = !semanticPlanOk || !portfolioEligible;

  useEffect(() => {
    const blocked = !orgSlugParam || !org?.slug || org.slug !== orgSlugParam;
    orgLoadDebug("dashboard:gate", {
      blocked,
      orgSlugParam,
      storeSlug: org?.slug,
      storeOrgId: org?.id,
      storeLoading: useStore.getState().loading,
    });
  }, [orgSlugParam, org?.slug, org?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("upgraded") !== "true") return;
    setShowUpgradeBanner(true);
    const timeout = setTimeout(() => setShowUpgradeBanner(false), 5000);
    const next = new URL(window.location.href);
    next.searchParams.delete("upgraded");
    window.history.replaceState({}, "", next.toString());
    return () => clearTimeout(timeout);
  }, []);

  const portfolioOpenTitle = (() => {
    if (!org) return undefined;
    if (!semanticPlanOk) return tCoach("availableInStarter");
    if (!portfolioEligible) return tCoach("portfolioAnalyzeTooltip");
    return undefined;
  })();

  const scrollViewportToTop = () => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const mainEl = document.querySelector("main");
    if (mainEl instanceof HTMLElement) {
      mainEl.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  // Do not gate on global `loading`: OrgLayout can set it during background refreshes and trap the UI.
  if (!orgSlugParam || !org?.slug || org.slug !== orgSlugParam) return <LoadingScreen />;
  return (
    <div className="w-full px-10 py-8 fade-up">
      <div className="ph">
        <div className="ph-title">{t("title")}</div>
        <div className="ph-sub">{t("subtitle")}</div>
      </div>
      {showUpgradeBanner && org && (
        <button
          type="button"
          onClick={() => setShowUpgradeBanner(false)}
          className="w-full text-left mb-4"
          style={{
            border: "1px solid color-mix(in srgb, var(--scaled) 35%, transparent)",
            background: "color-mix(in srgb, var(--scaled) 10%, transparent)",
            color: "var(--scaled)",
            borderRadius: "var(--r)",
            padding: "10px 14px",
          }}
        >
          {t("upgradeSuccess", { plan: formatPlanName(displayPlanForBanner) })}
        </button>
      )}

      {/* Top section — left grows, right is fixed 420px, both stretch to same height */}
      <div className="dashboard-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 12,
        alignItems: "stretch",
      }}>
        {/* Left col — metrics on top, sprint card below */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricsBar onRiskClick={() => setRiskFilter((f) => !f)} riskFilterActive={riskFilter} />
          <div style={{ flex: 1 }}>
            <SprintCard fullHeight />
          </div>
        </div>

        {/* Right col — donut fills 100% of the row height */}
        <PortfolioDonut />
      </div>

      <OwnedBetsSection />
      <Section label={t("activeBets")}>
        <ActiveBetsTable riskFilter={riskFilter} onClearRiskFilter={() => setRiskFilter(false)} />
      </Section>
      {showPortfolioRow && org && (
        <Section label={tCoach("portfolioAnalysis")}>
          <button
            type="button"
            disabled={portfolioOpenDisabled}
            title={portfolioOpenTitle}
            onClick={() => {
              scrollViewportToTop();
              setPortfolioSlideOpen(true);
              setPortfolioRunNonce((n) => n + 1);
            }}
            className="btn-primary py-2 px-3 text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {tCoach("analyzePortfolioBtn")}
          </button>
        </Section>
      )}
      {portfolioSlideOpen && org && semanticPlanOk && portfolioEligible && (
        <PortfolioSemanticSlideover
          open={portfolioSlideOpen}
          onClose={() => setPortfolioSlideOpen(false)}
          title={tCoach("portfolioAnalysis")}
        >
          <SemanticCoachPanel
            compact
            mode="portfolio"
            orgId={org.id}
            orgName={org.name}
            coachSemanticEnabled={org.coach_semantic_enabled}
            plan={planForCoach}
            portfolioBets={activeBets}
            sprint={activeSprint ?? null}
            autoRun={false}
            portfolioRunNonce={portfolioRunNonce}
          />
        </PortfolioSemanticSlideover>
      )}
      <Section label={t("decisionFocus")}><DecisionFocus /></Section>
      <Section label={t("overdueReview")}><PendingUpdates type="review" /></Section>
      <Section label={t("overdueSignal")}><PendingUpdates type="signal" /></Section>
      <RollupDashboard />
    </div>
  );
}
