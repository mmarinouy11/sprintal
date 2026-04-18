"use client";
import { useStore } from "@/lib/store";
import { sprintProgress, daysRemaining } from "@/lib/utils";

export default function SprintCard({ fullHeight = false }: { fullHeight?: boolean }) {
  const { sprints } = useStore();
  const active = sprints.find(s => s.status === "Active");

  const wrap: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderLeft: "3px solid var(--brand)",
    borderRadius: "var(--r)",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    height: fullHeight ? "100%" : "auto",
    boxSizing: "border-box",
  };

  if (!active) return (
    <div style={wrap}>
      <p style={{ fontFamily:"var(--font-body)", fontSize:"0.9375rem", color:"var(--t3)" }}>No active sprint.</p>
    </div>
  );

  const pct = sprintProgress(active.start_date, active.end_date);
  const days = daysRemaining(active.end_date);
  const signals = active.signals?.split(",").map(s => s.trim()).filter(Boolean) || [];

  return (
    <div style={wrap}>
      {/* Top */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:"1.125rem", color:"var(--text)", letterSpacing:"-0.015em" }}>
            {active.name}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.8125rem", color:"var(--t3)", marginTop:3 }}>
            {active.start_date} → {active.end_date} · {days}d remaining
          </div>
        </div>
        <span className="badge badge-sprint" style={{ flexShrink:0, marginTop:2 }}>Active Sprint</span>
      </div>

      {/* Focus */}
      {active.focus && (
        <div style={{ fontFamily:"var(--font-body)", fontSize:"0.9375rem", color:"var(--t2)", lineHeight:1.55 }}>
          {active.focus}
        </div>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div>
          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", color:"var(--t3)", marginBottom:8 }}>
            Success Signals
          </div>
          {signals.slice(0,3).map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.875rem", fontFamily:"var(--font-body)", color:"var(--t2)", marginBottom:4 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--brand)", flexShrink:0 }}/>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      <div style={{ marginTop:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", color:"var(--t3)" }}>
            Sprint Progress
          </span>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.875rem", fontWeight:600, color:"var(--brand)" }}>
            {pct}%
          </span>
        </div>
        <div style={{ height:4, background:"var(--raised)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:"var(--brand)", borderRadius:3, transition:"width 0.6s ease" }}/>
        </div>
      </div>
    </div>
  );
}
