"use client";
import { useStore } from "@/lib/store";
import MetricsBar from "@/components/dashboard/MetricsBar";
import PortfolioDonut from "@/components/dashboard/PortfolioDonut";
import ActiveBetsTable from "@/components/dashboard/ActiveBetsTable";
import DecisionFocus from "@/components/dashboard/DecisionFocus";
import PendingUpdates from "@/components/dashboard/PendingUpdates";
import SprintCard from "@/components/sprints/SprintCard";
import LoadingScreen from "@/components/ui/LoadingScreen";
import RollupDashboard from "@/components/dashboard/RollupDashboard";
import OwnedBetsSection from "@/components/dashboard/OwnedBetsSection";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="section-label">{label}</div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { loading } = useStore();
  if (loading) return <LoadingScreen />;
  return (
    <div className="w-full px-10 py-8 fade-up">
      <div className="ph">
        <div className="ph-title">Executive Dashboard</div>
        <div className="ph-sub">Strategic overview · Current sprint only</div>
      </div>

      {/* Top section — left grows, right is fixed 420px, both stretch to same height */}
      <div style={{
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
      <Section label="Active Bets in Current Sprint"><ActiveBetsTable /></Section>
      <Section label="Decision Focus"><DecisionFocus /></Section>
      <Section label="Overdue — Strategic Review"><PendingUpdates type="review" /></Section>
      <Section label="Overdue — Signal Check"><PendingUpdates type="signal" /></Section>
      <RollupDashboard />
    </div>
  );
}
