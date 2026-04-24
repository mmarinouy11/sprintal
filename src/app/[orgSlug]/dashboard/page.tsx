"use client";
import { useMemo } from "react";
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
import SemanticCoachPanel from "@/components/coach/SemanticCoachPanel";
import { effectiveCoachPlan } from "@/lib/coach/effectiveCoachPlan";
import { COACH_LIMITS } from "@/types";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="section-label">{label}</div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { loading, org, bets, sprints, rootPlan } = useStore();
  const planForCoach = effectiveCoachPlan(rootPlan, org?.plan);
  const t = useT("dashboard");
  const tCoach = useT("coach");
  const activeSprint = sprints.find((s) => s.status === "Active");
  const activeBets = useMemo(
    () => bets.filter((b) => b.sprint_id === activeSprint?.id && b.status === "Active"),
    [bets, activeSprint?.id]
  );
  /** Always mount when there are active sprint bets so users see upgrade/settings hints instead of nothing */
  const showPortfolioCoachSection = !!org && activeBets.length > 0;

  if (loading) return <LoadingScreen />;
  return (
    <div className="w-full px-10 py-8 fade-up">
      <div className="ph">
        <div className="ph-title">{t("title")}</div>
        <div className="ph-sub">{t("subtitle")}</div>
      </div>

      {/* Top section — left grows, right is fixed 420px, both stretch to same height */}
      <div className="dashboard-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 12,
        alignItems: "stretch",
      }}>
        {/* Left col — metrics on top, sprint card below */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricsBar />
          <div style={{ flex: 1 }}>
            <SprintCard fullHeight />
          </div>
        </div>

        {/* Right col — donut fills 100% of the row height */}
        <PortfolioDonut />
      </div>

      <OwnedBetsSection />
      <Section label={t("activeBets")}><ActiveBetsTable /></Section>
      {showPortfolioCoachSection && org && (
        <Section label={tCoach("portfolioAnalysis")}>
          <SemanticCoachPanel
            mode="portfolio"
            orgId={org.id}
            orgName={org.name}
            coachSemanticEnabled={org.coach_semantic_enabled}
            plan={planForCoach}
            portfolioBets={activeBets}
            sprint={activeSprint ?? null}
            autoRun={(COACH_LIMITS[planForCoach]?.semantic ?? 0) !== 0}
          />
        </Section>
      )}
      <Section label={t("decisionFocus")}><DecisionFocus /></Section>
      <Section label={t("overdueReview")}><PendingUpdates type="review" /></Section>
      <Section label={t("overdueSignal")}><PendingUpdates type="signal" /></Section>
      <RollupDashboard />
    </div>
  );
}
