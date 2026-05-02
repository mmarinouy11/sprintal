"use client";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";

function Metric({ label, value, sub, color, last }: { label:string; value:number; sub:string; color:string; last?:boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (value === 0) { ref.current.textContent = "0"; return; }
    const dur = 600, t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      if (ref.current) ref.current.textContent = String(Math.round(e * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <div style={{
      padding:"18px 24px",
      borderRight: last ? "none" : "1px solid var(--border)",
      display:"flex", flexDirection:"column", gap:6,
    }}>
      <div style={{
        fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700,
        letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--t3)",
      }}>
        {label}
      </div>
      <div ref={ref} style={{
        fontFamily:"var(--font-display)", fontWeight:700,
        fontSize:"3rem", letterSpacing:"-0.025em", lineHeight:1, color,
      }}>0</div>
      <div style={{
        fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)",
      }}>
        {sub}
      </div>
    </div>
  );
}

export interface MetricsBarProps {
  onRiskClick?: () => void;
  riskFilterActive?: boolean;
}

export default function MetricsBar({ onRiskClick, riskFilterActive }: MetricsBarProps = {}) {
  const { sprints, bets } = useStore();
  const t = useT("dashboard");
  const active = sprints.find(s => s.status === "Active");
  const ab = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"repeat(4,1fr)",
      border:"1px solid var(--border)", borderLeft:"3px solid var(--brand)",
      borderRadius:"var(--r)", background:"var(--surface)", overflow:"hidden",
    }}>
      <Metric label={t("activeSprint")}  value={active?1:0} sub={active?.name||t("none")}  color="var(--brand)" />
      <Metric label={t("betsInSprint")} value={ab.length}  sub={t("currentlyTesting")}     color="var(--text)" />
      <Metric label={t("strongSignal")}  value={ab.filter(b=>b.signal==="Strong").length} sub={t("candidatesToScale")} color="var(--scaled)" />
      <div
        onClick={onRiskClick}
        style={{
          cursor: onRiskClick ? "pointer" : "default",
          outline: riskFilterActive ? "2px solid var(--unclear)" : undefined,
          background: riskFilterActive ? "rgba(234,160,18,0.06)" : undefined,
        }}
      >
        <Metric label={t("atRisk")} value={ab.filter(b=>b.signal!=="Strong").length} sub={t("needADecision")} color="var(--unclear)" last />
      </div>
    </div>
  );
}
