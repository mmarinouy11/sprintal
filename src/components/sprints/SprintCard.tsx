"use client";
import { useState } from "react";
import { useT, useLocale } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { sprintProgress, daysRemaining } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

function localeTag(locale: "en" | "es" | "pt"): string {
  if (locale === "es") return "es";
  if (locale === "pt") return "pt-BR";
  return "en-US";
}

export default function SprintCard({ fullHeight = false }: { fullHeight?: boolean }) {
  const { sprints, updateSprint, currentRole } = useStore();
  const t = useT("dashboard");
  const tg = useT();
  const locale = useLocale();
  const active = sprints.find(s => s.status === "Active");
  const planned = sprints.find(s => s.status === "Planned");
  const canActivate = currentRole === "owner" || currentRole === "admin";
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState("");

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

  async function activateSprint(sprintId: string) {
    setActivateError("");
    setActivating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setActivateError(tg("sprints.alreadyActive"));
      setActivating(false);
      return;
    }
    const res = await fetch("/api/sprint/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sprintId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActivateError(
        body.error === "already_active" ? tg("sprints.alreadyActive") : (body.error || tg("sprints.alreadyActive"))
      );
      setActivating(false);
      return;
    }
    if (body.sprint) updateSprint(body.sprint);
    setActivating(false);
  }

  if (!active && planned) {
    return (
      <div data-testid="sprint-card" style={wrap}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:"1.125rem", color:"var(--text)", letterSpacing:"-0.015em" }}>
              {planned.name}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.8125rem", color:"var(--t3)", marginTop:3 }}>
              {planned.start_date} → {planned.end_date}
            </div>
          </div>
          <span className="badge badge-planned" style={{ flexShrink:0, marginTop:2 }}>{tg("status.planned")}</span>
        </div>
        {planned.focus && (
          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.9375rem", color:"var(--t2)", lineHeight:1.55 }}>
            {planned.focus}
          </div>
        )}
        {activateError && (
          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--killed)" }}>{activateError}</div>
        )}
        {canActivate && (
          <button
            type="button"
            className="btn-primary"
            disabled={activating}
            onClick={() => activateSprint(planned.id)}
            style={{ alignSelf: "flex-start" }}
          >
            {activating ? tg("sprints.activating") : tg("sprints.activateSprint")}
          </button>
        )}
      </div>
    );
  }

  if (!active) return (
    <div data-testid="sprint-card" style={wrap}>
      <p style={{ fontFamily:"var(--font-body)", fontSize:"0.9375rem", color:"var(--t3)" }}>{t("noActiveSprint")}</p>
    </div>
  );

  const pct = sprintProgress(active.start_date, active.end_date);
  const days = daysRemaining(active.end_date);
  const signals = active.signals?.split(",").map(s => s.trim()).filter(Boolean) || [];

  const today = new Date();
  const elapsed = Math.max(0, Math.floor((today.getTime() - new Date(active.start_date).getTime()) / 86400000));
  const totalDays = Math.floor((new Date(active.end_date).getTime() - new Date(active.start_date).getTime()) / 86400000);
  const startMs = new Date(active.start_date).getTime();
  const endMs = new Date(active.end_date).getTime();
  const durationMs = endMs - startMs;
  const reviewMilestones = [0.33, 0.66, 0.9].map(p => new Date(startMs + p * durationMs));
  const nextReview = reviewMilestones.find(d => d > today);
  const reviewDateLabel = nextReview
    ? nextReview.toLocaleDateString(localeTag(locale), { day: "numeric", month: "short" })
    : "";

  return (
    <div data-testid="sprint-card" style={wrap}>
      {/* Top */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:"1.125rem", color:"var(--text)", letterSpacing:"-0.015em" }}>
            {active.name}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.8125rem", color:"var(--t3)", marginTop:3 }}>
            {active.start_date} → {active.end_date} · {t("daysRemaining", { days })}
          </div>
        </div>
        <span className="badge badge-sprint" style={{ flexShrink:0, marginTop:2 }}>{t("activeSprint")}</span>
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
            {t("successSignals")}
          </div>
          {signals.slice(0,3).map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.875rem", fontFamily:"var(--font-body)", color:"var(--t2)", marginBottom:4 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--brand)", flexShrink:0 }}/>
              {s}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "row", gap: 24, marginTop: 8, fontSize: "0.8125rem", color: "var(--t3)" }}>
        <span>{t("sprintDayOfTotal", { current: String(elapsed), total: String(totalDays) })}</span>
        {nextReview && (
          <span>{t("nextStrategicReview", { date: reviewDateLabel })}</span>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginTop:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", color:"var(--t3)" }}>
            {t("sprintProgress")}
          </span>
          <span style={{ fontFamily:"var(--font-display)", fontSize:"0.875rem", fontWeight:600, color:"var(--brand)" }}>
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
