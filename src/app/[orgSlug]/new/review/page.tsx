"use client";
import { useT } from "@/lib/i18n";
import { useSyntacticCoach } from "@/lib/coach/useSyntacticCoach";
import CoachObservation from "@/components/coach/CoachObservation";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal, { Field, ModalFooter } from "@/components/ui/Modal";
import type { BetStatus } from "@/types";



function Rule({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pl-3" style={{ borderLeft:`2px solid ${color}` }}>
      <div className="font-semibold text-sm mb-1" style={{ color }}>{title}</div>
      <div style={{ fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>{children}</div>
    </div>
  );
}

function SidebarContent({ t }: { t: (k: string) => string }) {
  return (
  <div>
    <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700,
      letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--brand)", marginBottom:6 }}>
      Strategic Review
    </div>
    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.25rem",
      color:"var(--text)", letterSpacing:"-0.02em", marginBottom:8 }}>
      Evaluate Evidence
    </div>
    <p style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t2)",
      lineHeight:1.6, marginBottom:20 }}>
      {t("sidebar.reviewDesc")}
    </p>
    <div style={{ marginBottom:16 }}>
      <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.875rem",
        color:"var(--text)", marginBottom:12 }}>{t("sidebar.betOutcomes")}</div>
      <Rule color="var(--active)"  title={t("keepActive")}>{t("sidebar.keepActiveRuleDesc")}</Rule>
      <Rule color="var(--scaled)"  title={t("scale")}>{t("sidebar.scaleRuleDesc2")}</Rule>
      <Rule color="var(--pivoted)" title={t("pivot")}>{t("sidebar.pivotRuleDesc")}</Rule>
      <Rule color="var(--done)"    title={t("markAsDone")}>{t("sidebar.doneRuleDesc")}</Rule>
      <Rule color="var(--killed)"  title={t("kill")}>{t("sidebar.killRuleDesc")}</Rule>
    </div>
    <div style={{ paddingTop:16, borderTop:"1px solid var(--border)" }}>
      <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.875rem",
        color:"var(--text)", marginBottom:6 }}>{t("sidebar.cadenceTitle")}</div>
      <p style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>
        {t("sidebar.reviewCadenceDesc")}
      </p>
    </div>
  </div>
  );
}

export default function StrategicReviewPage() {
  const t = useT("form");
  const coach = useSyntacticCoach();
  const OUTCOMES: { value: BetStatus; label: string; color: string; hint: string }[] = [
    { value:"Active",  label:t("keepActive"),  color:"var(--active)",  hint:t("keepActiveDesc") },
    { value:"Scaled",  label:t("scale"),        color:"var(--scaled)",  hint:t("scaleDesc") },
    { value:"Pivoted", label:t("pivot"),        color:"var(--pivoted)", hint:t("pivotDesc") },
    { value:"Done",    label:t("markAsDone"),   color:"var(--done)",    hint:t("doneDesc") },
    { value:"Killed",  label:t("kill"),         color:"var(--killed)",  hint:t("killDesc") },
  ];
  const router = useRouter();
  const params = useParams();
  const { org, sprints, bets, addEvidence, updateBet, addBet } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const activeBets = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const [betId, setBetId] = useState(activeBets[0]?.id || "");
  const [outcome, setOutcome] = useState<BetStatus>("Active");
  const [actual, setActual] = useState("");
  const [insight, setInsight] = useState("");
  const [action, setAction] = useState("");
  const [newHyp, setNewHyp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const bet = bets.find(b => b.id === betId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !bet) return;
    setSaving(true);
    setError("");
    try {
      const date = new Date().toISOString().split("T")[0];
      const { data: ev } = await supabase.from("evidence").insert({
        org_id: org.id, bet_id: betId, date, actual, insight, new_status: outcome, action
      }).select().limit(1).maybeSingle();
      if (ev) addEvidence(ev);

      const updatedBet = {
        ...bet, status: outcome, last_reviewed: date, last_note: insight.slice(0, 80),
        ...(outcome === "Pivoted" && newHyp ? { hypothesis: newHyp } : {}),
      };
      await supabase.from("bets").update({
        status: outcome, last_reviewed: date, last_note: insight.slice(0, 80),
        ...(outcome === "Pivoted" && newHyp ? { hypothesis: newHyp } : {}),
      }).eq("id", betId);
      updateBet(updatedBet);

      if (outcome === "Scaled" || outcome === "Pivoted") {
        const nextSprint = sprints.find(s => s.status === "Planned");
        const { data: draft } = await supabase.from("bets").insert({
          org_id: org.id, sprint_id: nextSprint?.id || bet.sprint_id,
          name: `${bet.name} — ${outcome === "Scaled" ? t("scale") : t("pivot")}`,
          owner_area: bet.owner_area, owner_contact: bet.owner_contact,
          status: "Active", signal: "Unclear", outcome: bet.outcome,
          hypothesis: outcome === "Pivoted" && newHyp ? newHyp : bet.hypothesis,
          indicators: bet.indicators, kill_criteria: bet.kill_criteria,
          scale_trigger: bet.scale_trigger, alignment: bet.alignment,
          revenue: bet.revenue, margin: bet.margin, importance: bet.importance,
          is_draft: true, source_bet_id: bet.id,
          last_note: `Draft from ${outcome} of ${bet.name}`,
        }).select().limit(1).maybeSingle();
        if (draft) addBet(draft);
      }

      setSaving(false);
      router.push(`/${params.orgSlug}/dashboard`);
    } catch {
      setError(t("errorCreating"));
      setSaving(false);
    }
  }

  return (
    <Modal title={t("strategicReview")} subtitle={t("reviewSubtitle")} sidebar={<SidebarContent t={t} />}>
      <form onSubmit={save}>
        <Field label={t("betLabel")}>
          <select className="input" value={betId} onChange={e => setBetId(e.target.value)}>
            {activeBets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>

        {bet && (
          <div className="rounded p-4 mb-4" style={{ background:"var(--raised)", border:"1px solid var(--border)" }}>
            <div className="t-label mb-1">{t("hypothesis")}</div>
            <div className="text-sm mb-3" style={{ color:"var(--t2)" }}>{bet.hypothesis || "—"}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="t-label mb-1" style={{ color:"var(--killed)" }}>{t("killIfLabel")}</div>
                <div className="text-sm" style={{ color:"var(--t2)" }}>{bet.kill_criteria || "—"}</div>
              </div>
              <div>
                <div className="t-label mb-1" style={{ color:"var(--scaled)" }}>{t("scaleWhenLabel")}</div>
                <div className="text-sm" style={{ color:"var(--t2)" }}>{bet.scale_trigger || "—"}</div>
              </div>
            </div>
          </div>
        )}

        <Field label={t("whatHappened")}>
          <textarea className="input" rows={3} value={actual} onChange={e => setActual(e.target.value)} required
            onBlur={e => coach.check("actual", e.target.value, org?.id)}
            placeholder={t("whatHappenedPlaceholder")} />
          <CoachObservation observation={coach.results["actual"]?.observation || null} loading={coach.results["actual"]?.loading || false} />
        </Field>

        <Field label={t("insight")}>
          <textarea className="input" rows={3} value={insight} onChange={e => setInsight(e.target.value)} required
            onBlur={e => coach.check("review_insight", e.target.value, org?.id)}
            placeholder={t("insightPlaceholder")} />
          <CoachObservation observation={coach.results["review_insight"]?.observation || null} loading={coach.results["review_insight"]?.loading || false} />
        </Field>

        <Field label={t("decision")}>
          <div className="space-y-2">
            {OUTCOMES.map(o => (
              <button key={o.value} type="button" onClick={() => setOutcome(o.value)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-colors"
                style={{
                  border: outcome === o.value ? `1.5px solid ${o.color}` : "1px solid var(--border-mid)",
                  background: outcome === o.value ? `color-mix(in srgb, ${o.color} 8%, var(--bg))` : "var(--bg)",
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.color }} />
                <div>
                  <div className="font-semibold text-sm" style={{ color:"var(--text)" }}>{o.label}</div>
                  <div className="text-xs" style={{ color:"var(--t3)", fontFamily:"var(--font-body)" }}>{o.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </Field>

        {outcome === "Pivoted" && (
          <Field label={t("updatedHypothesis")}>
            <textarea className="input" rows={3} value={newHyp} onChange={e => setNewHyp(e.target.value)}
              placeholder={t("updatedHypothesisPlaceholder")} />
          </Field>
        )}

        <Field label={t("nextAction")}>
          <input className="input" value={action} onChange={e => setAction(e.target.value)}
            placeholder={t("nextActionPlaceholder")} />
        </Field>

        {error && (
          <div className="rounded px-4 py-3 text-sm mb-2"
            style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", color:"var(--killed)" }}>
            {error}
          </div>
        )}

        <ModalFooter>
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">{t("cancel")}</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? t("saving") : t("logReview")}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
