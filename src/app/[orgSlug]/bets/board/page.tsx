"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { SignalBadge, AreaTag } from "@/components/ui/Badge";
import { useRouter, useParams } from "next/navigation";
import type { BetStatus, Bet } from "@/types";
import BetDetailPanel from "@/components/bets/BetDetailPanel";

const COLS: BetStatus[] = ["Active","Scaled","Pivoted","Done","Killed"];
const COLORS: Record<BetStatus,string> = {
  Active: "#2563EB", Scaled: "#22C55E", Pivoted: "#7C3AED", Done: "#0891B2", Killed: "#DC2626",
};

export default function BetsBoardPage() {
  const { bets, sprints, evidence, signalChecks } = useStore();
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const router = useRouter();
  const params = useParams();

  const totalBets = bets.length;

  return (
    <div className="w-full px-10 py-8">
      <div className="ph">
        <div className="ph-title">Bets — Board</div>
        <div className="ph-sub">Grouped by status · Click any bet to expand</div>
      </div>

      {totalBets === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 24px", textAlign: "center",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🎯</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "1.125rem", color: "var(--text)", marginBottom: 8 }}>
            No bets yet
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
            color: "var(--t3)", maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
            Bets are testable hypotheses. Create your first bet to start tracking what your team is betting on this sprint.
          </p>
          <button className="btn-primary"
            onClick={() => router.push(`/${params.orgSlug}/new/bet`)}>
            + New Bet
          </button>
        </div>
      ) : (
        <div className="bets-board-grid grid grid-cols-5 gap-3">
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
                  <span style={{
                    background: "var(--raised)", color: "var(--t2)",
                    borderRadius: 4, padding: "1px 6px",
                    fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 500,
                  }}>{cb.length}</span>
                </div>

                {cb.length === 0 ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", padding: "24px 8px", gap: 6,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: `${COLORS[col]}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%",
                        background: `${COLORS[col]}40` }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem",
                      color: "var(--t3)" }}>None</span>
                  </div>
                ) : (
                  cb.map(b => (
                    <div key={b.id}
                      onClick={() => setSelectedBet(b)}
                      className="rounded p-3 mb-2 cursor-pointer card-hover"
                      style={{
                        background: "var(--raised)",
                        border: "1px solid var(--border)",
                        borderLeft: b.is_draft ? "2px solid var(--pivoted)" : "1px solid var(--border)",
                      }}>
                      <div className="font-medium text-sm mb-1" style={{ color: "var(--text)" }}>
                        {b.name}
                        {b.is_draft && (
                          <span className="ml-1" style={{
                            fontSize: "0.6rem", color: "var(--pivoted)",
                            fontFamily: "var(--font-body)", fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>DRAFT</span>
                        )}
                      </div>
                      <div className="mb-2" style={{
                        fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--t3)" }}>
                        {sprints.find(s => s.id === b.sprint_id)?.name || "—"}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <SignalBadge signal={b.signal} />
                        <AreaTag area={b.owner_area} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

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
