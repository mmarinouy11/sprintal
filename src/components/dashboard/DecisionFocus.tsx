"use client";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { AreaTag } from "@/components/ui/Badge";
import { useState } from "react";
import type { Bet } from "@/types";
import BetDetailPanel from "@/components/bets/BetDetailPanel";

// Labels defined inside component using translations

function EmptyState({ color }: { color: string }) {
  return (
    <div style={{ padding:"24px 16px", textAlign:"center" }}>
      <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}15`, margin:"0 auto 8px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:color, opacity:0.4 }}/>
      </div>
      <div style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t3)", fontStyle:"italic" }}>None</div>
    </div>
  );
}

export default function DecisionFocus() {
  const t = useT("dashboard");
  const COLS = [
    { label:t("candidatesToScale"), sig:"Strong",  color:"var(--scaled)",  border:"#22C55E" },
    { label:t("atRiskUnclear"),     sig:"Unclear", color:"var(--unclear)", border:"#EAA012" },
    { label:t("candidatesToKill"),  sig:"Weak",    color:"var(--killed)",  border:"#F87171" },
  ];
  const { bets, sprints, evidence, signalChecks } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const ab = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const [selectedBet, setSelectedBet] = useState<Bet|null>(null);

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {COLS.map(col => {
          const items = ab.filter(b => b.signal === col.sig);
          return (
            <div key={col.label} style={{ borderRadius:"var(--r)", overflow:"hidden", border:"1px solid var(--border)", borderLeft:`3px solid ${col.border}` }}>
              {/* Header */}
              <div style={{ padding:"10px 14px", background:"var(--raised)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:col.border, flexShrink:0 }}/>
                <span style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.9375rem", color:col.color, flex:1 }}>
                  {col.label}
                </span>
                <span style={{
                  fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.875rem",
                  color:items.length > 0 ? col.color : "var(--t3)",
                  background: items.length > 0 ? `${col.border}15` : "var(--surface)",
                  border:`1px solid ${items.length > 0 ? `${col.border}30` : "var(--border)"}`,
                  borderRadius:"var(--rs)", padding:"1px 8px", minWidth:24, textAlign:"center",
                }}>
                  {items.length}
                </span>
              </div>
              {/* Cards */}
              <div style={{ padding:items.length > 0 ? 10 : 0, background:"var(--bg)" }}>
                {items.length === 0
                  ? <EmptyState color={col.border}/>
                  : items.map(b => (
                      <div key={b.id} onClick={() => setSelectedBet(b)}
                        style={{
                          background:"var(--surface)", border:"1px solid var(--border)",
                          borderRadius:"var(--rs)", padding:"12px 14px", marginBottom:8,
                          cursor:"pointer", transition:"border-color 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = col.border)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                        <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.9375rem", color:"var(--text)", marginBottom:6 }}>
                          {b.name}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: (col.sig === "Strong" && b.scale_trigger) || (col.sig === "Weak" && b.kill_criteria) ? 8 : 0 }}>
                          <AreaTag area={b.owner_area}/>
                          {b.owner_contact && (
                            <span style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t3)" }}>{b.owner_contact}</span>
                          )}
                        </div>
                        {col.sig === "Strong" && b.scale_trigger && (
                          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t3)", lineHeight:1.4 }}>
                            Scale when: {b.scale_trigger}
                          </div>
                        )}
                        {col.sig === "Weak" && b.kill_criteria && (
                          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t3)", lineHeight:1.4 }}>
                            Kill if: {b.kill_criteria}
                          </div>
                        )}
                        {col.sig === "Unclear" && b.last_note && (
                          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t3)", lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                            {b.last_note}
                          </div>
                        )}
                      </div>
                    ))
                }
              </div>
            </div>
          );
        })}
      </div>
      {selectedBet && (
        <BetDetailPanel bet={selectedBet} evidence={evidence} signalChecks={signalChecks}
          sprintName={active?.name||"—"} onClose={()=>setSelectedBet(null)}/>
      )}
    </>
  );
}
