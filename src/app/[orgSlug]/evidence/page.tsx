"use client";
import { useStore } from "@/lib/store";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/Badge";

export default function EvidencePage() {
  const { evidence, bets } = useStore();
  const t = useTranslations();
  return (
    <div className="w-full px-10 py-8">
      <div className="mb-8 pb-5 border-b border-[var(--border)]">
        <h1 className="ph-title">Evidence Log</h1>
        <p className="ph-sub">Signal tracking and decisions</p>
      </div>

      {evidence.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 24px", textAlign: "center",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", borderLeft: "3px solid var(--brand)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "1.125rem", color: "var(--text)", marginBottom: 8 }}>
            No evidence yet
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
            color: "var(--t3)", maxWidth: 360, lineHeight: 1.6 }}>
            Evidence is captured when you run a Strategic Review. Start by selecting a bet
            and logging what happened and what it means.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded overflow-hidden"
          style={{ borderLeft: "3px solid var(--brand)" }}>
          <table className="tbl">
            <thead>
              <tr>
                {["Date", "Bet", "Actual", "Insight", "New Status"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.map(e => {
                const bet = bets.find(b => b.id === e.bet_id);
                return (
                  <tr key={e.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                      color: "var(--t3)", whiteSpace: "nowrap" }}>{e.date}</td>
                    <td style={{ fontWeight: 500, color: "var(--text)" }}>{bet?.name || "—"}</td>
                    <td style={{ color: "var(--t2)" }}>{e.actual}</td>
                    <td style={{ color: "var(--t2)" }}>{e.insight}</td>
                    <td>{e.new_status && <StatusBadge status={e.new_status as any} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
