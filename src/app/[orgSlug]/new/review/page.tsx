"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal, { Field, ModalFooter } from "@/components/ui/Modal";
import type { BetStatus } from "@/types";

const OUTCOMES: { value: BetStatus; label: string; color: string; hint: string }[] = [
  { value:"Active",  label:"Keep Active",  color:"var(--active)",  hint:"Keep testing, no change." },
  { value:"Scaled",  label:"Scale",        color:"var(--scaled)",  hint:"Confirmed. Generates a draft for next sprint." },
  { value:"Pivoted", label:"Pivot",        color:"var(--pivoted)", hint:"New direction. Generates a draft with updated hypothesis." },
  { value:"Done",    label:"Mark as Done", color:"var(--done)",    hint:"Reached its conclusion." },
  { value:"Killed",  label:"Kill",         color:"var(--killed)",  hint:"No signal. Stop now." },
];

function Rule({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pl-3" style={{ borderLeft:`2px solid ${color}` }}>
      <div className="font-semibold text-sm mb-1" style={{ color }}>{title}</div>
      <div style={{ fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>{children}</div>
    </div>
  );
}

const SIDEBAR = (
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
      Not a status update — a structured decision moment. What happened, what does it tell us, and what do we do next?
    </p>
    <div style={{ marginBottom:16 }}>
      <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.875rem",
        color:"var(--text)", marginBottom:12 }}>Bet Outcomes</div>
      <Rule color="var(--active)"  title="Keep Active">Not enough signal yet. Continue testing.</Rule>
      <Rule color="var(--scaled)"  title="Scale">Hypothesis confirmed. Generates a draft bet for the next sprint.</Rule>
      <Rule color="var(--pivoted)" title="Pivot">Direction changes. Generates a draft with updated hypothesis.</Rule>
      <Rule color="var(--done)"    title="Mark as Done">Reached its natural conclusion.</Rule>
      <Rule color="var(--killed)"  title="Kill">No signal after sufficient time. Stop now, free the capacity.</Rule>
    </div>
    <div style={{ paddingTop:16, borderTop:"1px solid var(--border)" }}>
      <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.875rem",
        color:"var(--text)", marginBottom:6 }}>Cadence</div>
      <p style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>
        3× per sprint. Signal Checks happen at the midpoint — they update signal strength but do not change bet status.
      </p>
    </div>
  </div>
);

export default function StrategicReviewPage() {
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
      }).select().single();
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
          name: `${bet.name} — ${outcome === "Scaled" ? "Scale" : "Pivot"}`,
          owner_area: bet.owner_area, owner_contact: bet.owner_contact,
          status: "Active", signal: "Unclear", outcome: bet.outcome,
          hypothesis: outcome === "Pivoted" && newHyp ? newHyp : bet.hypothesis,
          indicators: bet.indicators, kill_criteria: bet.kill_criteria,
          scale_trigger: bet.scale_trigger, alignment: bet.alignment,
          revenue: bet.revenue, margin: bet.margin, importance: bet.importance,
          is_draft: true, source_bet_id: bet.id,
          last_note: `Draft from ${outcome} of ${bet.name}`,
        }).select().single();
        if (draft) addBet(draft);
      }

      setSaving(false);
      router.push(`/${params.orgSlug}/dashboard`);
    } catch {
      setError("Error al guardar. Intentá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Strategic Review" subtitle="Evidence-based decision. 3× per sprint cycle." sidebar={SIDEBAR}>
      <form onSubmit={save}>
        <Field label="Bet">
          <select className="input" value={betId} onChange={e => setBetId(e.target.value)}>
            {activeBets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>

        {bet && (
          <div className="rounded p-4 mb-4" style={{ background:"var(--raised)", border:"1px solid var(--border)" }}>
            <div className="t-label mb-1">Hypothesis</div>
            <div className="text-sm mb-3" style={{ color:"var(--t2)" }}>{bet.hypothesis || "—"}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="t-label mb-1" style={{ color:"var(--killed)" }}>Kill if</div>
                <div className="text-sm" style={{ color:"var(--t2)" }}>{bet.kill_criteria || "—"}</div>
              </div>
              <div>
                <div className="t-label mb-1" style={{ color:"var(--scaled)" }}>Scale when</div>
                <div className="text-sm" style={{ color:"var(--t2)" }}>{bet.scale_trigger || "—"}</div>
              </div>
            </div>
          </div>
        )}

        <Field label="What actually happened?">
          <textarea className="input" rows={3} value={actual} onChange={e => setActual(e.target.value)} required
            placeholder="e.g. AI usage at 52% in squads A and B" />
        </Field>

        <Field label="Insight — what does this tell us?">
          <textarea className="input" rows={3} value={insight} onChange={e => setInsight(e.target.value)} required
            placeholder="What did we learn?" />
        </Field>

        <Field label="Decision">
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
          <Field label="Updated Hypothesis">
            <textarea className="input" rows={3} value={newHyp} onChange={e => setNewHyp(e.target.value)}
              placeholder="New direction for the next sprint..." />
          </Field>
        )}

        <Field label="Next Action">
          <input className="input" value={action} onChange={e => setAction(e.target.value)}
            placeholder="One concrete step" />
        </Field>

        {error && (
          <div className="rounded px-4 py-3 text-sm mb-2"
            style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", color:"var(--killed)" }}>
            {error}
          </div>
        )}

        <ModalFooter>
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : "Log Review →"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
