"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { SignalBadge, AreaTag } from "@/components/ui/Badge";
import type { Bet } from "@/types";
import { useT } from "@/lib/i18n";
import BetDetailPanel from "@/components/bets/BetDetailPanel";

type ActiveBetsTableProps = {
  riskFilter?: boolean;
  onClearRiskFilter?: () => void;
};

export default function ActiveBetsTable({ riskFilter = false, onClearRiskFilter }: ActiveBetsTableProps = {}) {
  const { bets, sprints, evidence, signalChecks, betAlignments, org } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const ab = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const displayAb = riskFilter
    ? ab.filter(b => b.signal === "Unclear" || b.signal === "Weak")
    : ab;
  const [selectedBet, setSelectedBet] = useState<Bet|null>(null);
  const t = useT();
  const openBetPanel = (bet: Bet) => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const mainEl = document.querySelector("main");
    if (mainEl instanceof HTMLElement) {
      mainEl.scrollTo({ top: 0, behavior: "auto" });
    }
    setSelectedBet(bet);
  };

  const hasReviewed = displayAb.some(b => !!b.last_reviewed);
  const hasNote = displayAb.some(b => !!b.last_note);

  return (
    <>
      {riskFilter && (
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--unclear)",
            padding: "6px 12px",
            background: "rgba(234,160,18,0.06)",
            borderRadius: "var(--rs)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span>Mostrando bets en riesgo</span>
          <button
            type="button"
            onClick={() => onClearRiskFilter?.()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: "inherit",
              fontFamily: "var(--font-body)",
              padding: 0,
            }}
          >
            × Ver todas
          </button>
        </div>
      )}
      <div style={{ borderRadius:"var(--r)", overflow:"hidden", border:"1px solid var(--border)", borderLeft:"3px solid var(--active)" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("table.bet")}</th>
              <th>{t("table.owner")}</th>
              <th>{t("table.signal")}</th>
              {hasReviewed && <th>{t("table.lastReviewed")}</th>}
              {hasNote && <th>{t("table.note")}</th>}
            </tr>
          </thead>
          <tbody>
            {displayAb.length === 0
              ? <tr><td colSpan={3 + (hasReviewed ? 1 : 0) + (hasNote ? 1 : 0)} style={{ color:"var(--t3)", fontFamily:"var(--font-body)", fontStyle:"italic", padding:"20px 16px" }}>
                  {ab.length === 0 ? t("dashboard.noActiveBets") : "No hay bets en riesgo"}
                </td></tr>
              : displayAb.map(b => {
                  const incomplete = !b.kill_criteria || !b.scale_trigger || !b.hypothesis;
                  const isOrphan = b.bet_type !== "enabler" &&
                    (org?.cascade_level ?? 1) > 1 &&
                    !betAlignments.some(a => a.child_bet_id === b.id);
                  const isEnabler = b.bet_type === "enabler";
                  return (
                    <tr key={b.id} onClick={() => openBetPanel(b)} style={{ cursor:"pointer" }}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontFamily:"var(--font-body)", fontWeight:500, color:"var(--text)" }}>{b.name}</span>
                          {incomplete && (
                            <span title="Missing fields — click to complete"
                              style={{ width:16, height:16, borderRadius:"50%", background:"rgba(234,160,18,0.15)", color:"var(--unclear)", fontSize:"0.6rem", fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              !
                            </span>
                          )}
                          {isEnabler && (
                            <span title="Enabler bet" style={{ fontSize:"0.75rem" }}>⚙</span>
                          )}
                          {!isEnabler && isOrphan && (
                            <span title="Orphan — not aligned to parent bet"
                              style={{ padding:"1px 6px", borderRadius:3, fontSize:"0.6875rem",
                                fontFamily:"var(--font-body)", fontWeight:500,
                                background:"rgba(234,160,18,0.1)", color:"var(--unclear)",
                                border:"1px solid rgba(234,160,18,0.2)", flexShrink:0 }}>
                              {t("bet.orphan")}
                            </span>
                          )}
                          {b.parent_alert && (
                            <span title={`Parent bet was ${b.parent_alert_status}`}
                              style={{ padding:"1px 6px", borderRadius:3, fontSize:"0.6875rem",
                                fontFamily:"var(--font-body)", fontWeight:500,
                                background:"rgba(220,38,38,0.08)", color:"var(--killed)",
                                border:"1px solid rgba(220,38,38,0.15)", flexShrink:0 }}>
                              parent {b.parent_alert_status?.toLowerCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <AreaTag area={b.owner_area}/>
                          <span style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)" }}>{b.owner_contact}</span>
                        </div>
                      </td>
                      <td><SignalBadge signal={b.signal}/></td>
                      {hasReviewed && (
                        <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.8125rem", color:"var(--t3)" }}>
                          {b.last_reviewed || <span style={{ color:"var(--border-mid)" }}>—</span>}
                        </td>
                      )}
                      {hasNote && (
                        <td style={{ maxWidth:220 }}>
                          <span style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {b.last_note || <span style={{ color:"var(--border-mid)" }}>—</span>}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
      {selectedBet && (
        <BetDetailPanel bet={selectedBet} evidence={evidence} signalChecks={signalChecks}
          sprintName={active?.name||"—"} onClose={()=>setSelectedBet(null)}/>
      )}
    </>
  );
}
