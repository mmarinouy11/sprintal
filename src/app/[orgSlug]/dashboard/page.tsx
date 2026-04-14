"use client";
import { useStore } from "@/lib/store";
import MetricsBar from "@/components/dashboard/MetricsBar";
import PortfolioDonut from "@/components/dashboard/PortfolioDonut";
import ActiveBetsTable from "@/components/dashboard/ActiveBetsTable";
import DecisionFocus from "@/components/dashboard/DecisionFocus";
import PendingUpdates from "@/components/dashboard/PendingUpdates";
import SprintCard from "@/components/sprints/SprintCard";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function DashboardPage() {
  const { loading } = useStore();
  if (loading) return <LoadingScreen />;
  return (
    <div className="p-10 max-w-[1400px]">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Executive Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Strategic overview · Current sprint</p>
      </div>
      {/* Top band */}
      <div className="grid grid-cols-[1fr_420px] gap-4 mb-0">
        <div className="flex flex-col gap-3">
          <MetricsBar />
          <SprintCard compact />
        </div>
        <PortfolioDonut />
      </div>
      {/* Flow */}
      <div className="mt-8">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Active Bets in Current Sprint</div>
        <ActiveBetsTable />
      </div>
      <div className="mt-8">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Decision Focus</div>
        <DecisionFocus />
      </div>
      <div className="mt-8">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Pending — Monthly Review</div>
        <PendingUpdates type="review" />
      </div>
      <div className="mt-8 pb-16">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Pending — Signal Check</div>
        <PendingUpdates type="signal" />
      </div>
    </div>
  );
}
