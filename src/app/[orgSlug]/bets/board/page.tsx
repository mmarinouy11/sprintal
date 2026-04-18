"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { SignalBadge, AreaTag } from "@/components/ui/Badge";
import { STATUS_COLORS } from "@/lib/utils";
import type { BetStatus, Bet } from "@/types";
import BetDetailPanel from "@/components/bets/BetDetailPanel";

const COLS: BetStatus[] = ["Active","Scaled","Pivoted","Done","Killed"];
const COLORS: Record<BetStatus,string> = {
  Active: "#2563EB", Scaled: "#22C55E", Pivoted: "#7C3AED", Done: "#0891B2", Killed: "#DC2626",
};

export default function BetsBoardPage() {
  const { bets, sprints, evidence, signalChecks } = useStore();
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

  return (
    <div className="w-full px-10 py-8">
      <div className="ph">
        <div className="ph-title">Bets — Board</div>
        <div className="ph-sub">Grouped by status · Click any bet to expand</div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {COLS.map(col => {
          const cb = bets.filter(b => b.status === col);
          return (
            <div key={col} className="rounded p-3 min-h-48"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: `2px solid ${COLORS[col]}`,
              }}>
              <div className="flex items-center justify-between mb-3 pb-2"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="t-label" style={{ color: COLORS[col] }}>{col}</span>
                <span className="t-mono rounded px-1.5 py-0.5"
                  style={{ background: "var(--raised)", color: "var(--t2)" }}>{cb.length}</span>
              </div>
              {cb.map(b => (
                <div key={b.id}
                  onClick={() => setSelectedBet(b)}
                  className="rounded p-3 mb-2 cursor-pointer transition-colors"
                  style={{
                    background: "var(--raised)",
                    border: "1px solid var(--border)",
                    borderLeft: b.is_draft ? "2px solid var(--pivoted)" : "1px solid var(--border)",
                  }}>
                  <div className="font-medium text-sm mb-1" style={{ color: "var(--text)" }}>
                    {b.name}
                    {b.is_draft && (
                      <span className="ml-1 t-mono" style={{ fontSize: "0.6rem", color: "var(--pivoted)" }}>DRAFT</span>
                    )}
                  </div>
                  <div className="t-mono mb-2" style={{ color: "var(--t2)" }}>
                    {sprints.find(s => s.id === b.sprint_id)?.name || "—"}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SignalBadge signal={b.signal} />
                    <AreaTag area={b.owner_area} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selectedBet && (
        <BetDetailPanel
          bet={selectedBet}
          evidence={evidence}
          signalChecks={signalChecks}
          sprintName={sprints.find(s => s.id === selectedBet.sprint_id)?.name || "—"}
          onClose={() => setSelectedBet(null)}
        />
      )}
    </div>
  );
}
