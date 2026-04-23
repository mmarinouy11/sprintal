"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/i18n";
import { useT } from "@/lib/i18n";
import type { Bet, Sprint } from "@/types";
import { COACH_LIMITS } from "@/types";
import type { Plan } from "@/types";

type Mode = "bet" | "portfolio" | "review";

function mapBetPayload(b: Bet) {
  return {
    name: b.name,
    outcome: b.outcome || "",
    hypothesis: b.hypothesis || "",
    kill_criteria: b.kill_criteria || "",
    scale_trigger: b.scale_trigger || "",
    indicators: b.indicators || [],
    signal: b.signal,
    status: b.status,
    bet_type: b.bet_type,
    revenue: b.revenue,
    margin: b.margin,
    importance: b.importance,
  };
}

function mapSprintPayload(s: Sprint | null | undefined) {
  if (!s) return null;
  return {
    name: s.name,
    focus: s.focus || "",
    signals: s.signals || "",
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
  };
}

export interface SemanticCoachPanelProps {
  mode: Mode;
  orgId: string;
  orgName: string;
  coachSemanticEnabled: boolean;
  plan: Plan;
  bet?: Bet | null;
  sprint?: Sprint | null;
  siblingBets?: Bet[];
  portfolioBets?: Bet[];
  reviewActual?: string;
  /** Manual bet: user clicks. Portfolio: true. Review: driven by reviewRunNonce */
  autoRun?: boolean;
  reviewRunNonce?: number;
  className?: string;
}

const PHASE_MS = 4000;

export default function SemanticCoachPanel({
  mode,
  orgId,
  orgName,
  coachSemanticEnabled,
  plan,
  bet,
  sprint,
  siblingBets = [],
  portfolioBets = [],
  reviewActual = "",
  autoRun = false,
  reviewRunNonce = 0,
  className = "",
}: SemanticCoachPanelProps) {
  const t = useT("coach");
  const locale = useLocale();
  const limits = COACH_LIMITS[plan] || COACH_LIMITS.trial;
  const semanticAllowedByPlan = limits.semantic !== 0;

  const [loading, setLoading] = useState(false);
  const [observation, setObservation] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ title: string; url?: string }>>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ts, setTs] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const portfolioBetIds = useMemo(
    () => portfolioBets.map((b) => b.id).sort().join("|"),
    [portfolioBets]
  );

  const clearTimers = () => {
    if (phaseTimer.current) clearInterval(phaseTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    phaseTimer.current = null;
    progressTimer.current = null;
  };

  const runFetch = useCallback(async () => {
    if (!coachSemanticEnabled || !semanticAllowedByPlan) return;
    setLoading(true);
    setLimitReached(false);
    setError(null);
    setObservation(null);
    setSources([]);
    setPhase(0);
    setProgress(8);
    clearTimers();
    phaseTimer.current = setInterval(() => {
      setPhase((p) => (p < 2 ? p + 1 : p));
    }, PHASE_MS);
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(94, p + 2));
    }, 350);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("auth");
        return;
      }

      let body: Record<string, unknown> = {
        analysisType: mode,
        locale,
        orgId,
        orgName,
      };

      if (mode === "portfolio") {
        body = {
          ...body,
          analysisType: "portfolio",
          allBets: portfolioBets.map((b) => ({
            name: b.name,
            outcome: b.outcome || "",
            hypothesis: b.hypothesis || "",
            signal: b.signal,
            status: b.status,
            bet_type: b.bet_type,
            revenue: b.revenue,
            margin: b.margin,
            importance: b.importance,
            owner_area: b.owner_area || "",
          })),
          sprint: mapSprintPayload(sprint || null),
        };
      } else if (mode === "review" && bet) {
        body = {
          ...body,
          analysisType: "review",
          bet: mapBetPayload(bet),
          sprint: mapSprintPayload(sprint || null),
          siblingBetSummaries: siblingBets.map((b) => `${b.name}: ${b.outcome?.slice(0, 80) || ""}`),
          reviewWhatHappened: reviewActual.trim(),
        };
      } else if (mode === "bet" && bet) {
        body = {
          ...body,
          analysisType: "bet",
          bet: mapBetPayload(bet),
          sprint: mapSprintPayload(sprint || null),
          siblingBetSummaries: siblingBets.map((b) => `${b.name}: ${b.outcome?.slice(0, 80) || ""}`),
        };
      } else {
        setError("context");
        return;
      }

      const res = await fetch("/api/coach/semantic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        observation: string | null;
        sources?: Array<{ title: string; url?: string }>;
        limitReached?: boolean;
      };

      if (data.limitReached) {
        setLimitReached(true);
        return;
      }
      setObservation(data.observation ?? null);
      setSources(data.sources || []);
      setTs(new Date().toLocaleString(locale === "en" ? "en-US" : locale === "es" ? "es" : "pt-BR"));
    } catch {
      setError("fetch");
    } finally {
      clearTimers();
      setLoading(false);
      setProgress(100);
      setPhase(2);
    }
  }, [
    coachSemanticEnabled,
    semanticAllowedByPlan,
    mode,
    locale,
    orgId,
    orgName,
    bet,
    sprint,
    siblingBets,
    portfolioBets,
    reviewActual,
  ]);

  useEffect(() => {
    if (mode !== "portfolio" || !autoRun) return;
    if (!coachSemanticEnabled || !semanticAllowedByPlan) return;
    if (portfolioBets.length === 0) return;
    runFetch();
  }, [
    mode,
    autoRun,
    orgId,
    portfolioBetIds,
    coachSemanticEnabled,
    semanticAllowedByPlan,
    runFetch,
    portfolioBets.length,
  ]);

  useEffect(() => {
    if (mode !== "review" || !autoRun) return;
    if (reviewRunNonce === 0) return;
    if (!bet || reviewActual.trim().length < 30) return;
    runFetch();
  }, [reviewRunNonce, mode, autoRun, bet, reviewActual, runFetch]);

  const statusLabel =
    phase === 0 ? t("identifyingContext") : phase === 1 ? t("searchingTrends") : t("generatingAnalysis");

  if (!coachSemanticEnabled) {
    return (
      <div
        className={className}
        style={{
          marginTop: 12,
          padding: "12px 14px",
          borderRadius: "var(--r)",
          background: "rgba(92,106,196,0.06)",
          border: "1px solid rgba(92,106,196,0.18)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--t2)" }}>{t("notEnabled")}</p>
      </div>
    );
  }

  if (!semanticAllowedByPlan) {
    return (
      <div
        className={className}
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: "var(--r)",
          background: "var(--raised)",
          border: "1px solid var(--border)",
          fontSize: "0.8125rem",
          color: "var(--t2)",
        }}
      >
        <span style={{ color: "var(--brand)", fontWeight: 600 }}>{t("availableInStarter")}</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        marginTop: 12,
        padding: "14px 16px",
        borderRadius: "var(--r)",
        background: "rgba(92,106,196,0.06)",
        border: "1px solid rgba(92,106,196,0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: "var(--brand)", fontSize: "1rem" }}>✦</span>
        <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text)" }}>
          {t("strategicAnalysis")}
        </span>
      </div>

      {mode === "bet" && !autoRun && (
        <button
          type="button"
          onClick={() => runFetch()}
          disabled={loading || !bet}
          className="btn-primary py-2 px-3 text-sm mb-3"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {t("analyzeBtn")}
        </button>
      )}

      {loading && (
        <div style={{ marginBottom: 8 }}>
          <div className="t-mono text-sm mb-2" style={{ color: "var(--brand)" }}>
            {statusLabel}
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "var(--raised)",
              overflow: "hidden",
              border: "1px solid rgba(92,106,196,0.2)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--brand)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {limitReached && !loading && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--unclear)" }}>{t("limitReached")}</p>
      )}

      {error && !loading && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--killed)" }}>{t("analysisError")}</p>
      )}

      {!loading && observation && (
        <>
          <div
            style={{
              borderTop: "1px solid rgba(92,106,196,0.2)",
              margin: "10px 0",
              paddingTop: 10,
            }}
          />
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "0.9375rem",
              lineHeight: 1.55,
              color: "var(--text)",
              fontFamily: "var(--font-body)",
            }}
          >
            {observation}
          </p>
          {sources.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {sources.map((s, i) => (
                <div key={i} style={{ fontSize: "0.8125rem", marginBottom: 6 }}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--brand)", textDecoration: "underline" }}
                    >
                      ↗ {s.title}
                    </a>
                  ) : (
                    <span style={{ color: "var(--t2)" }}>↗ {s.title}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              borderTop: "1px solid rgba(92,106,196,0.2)",
              paddingTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="t-mono text-sm underline-offset-2"
              style={{
                background: "none",
                border: "none",
                color: "var(--brand)",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => runFetch()}
            >
              {t("refreshBtn")}
            </button>
            {ts && (
              <span className="t-mono" style={{ fontSize: "0.75rem", color: "var(--t3)" }}>
                {ts}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
