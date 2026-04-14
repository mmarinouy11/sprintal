"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { BetStatus } from "@/types";

const OUTCOMES: { value: BetStatus; label: string; color: string; hint: string }[] = [
  { value:"Active", label:"Keep Active", color:"#38BDF8", hint:"Keep testing, no change." },
  { value:"Scaled", label:"Scale", color:"#00C864", hint:"Confirmed. Generates a draft for next sprint." },
  { value:"Pivoted", label:"Pivot", color:"#A090FF", hint:"New direction. Generates a draft with updated hypothesis." },
  { value:"Done", label:"Mark as Done", color:"#34D399", hint:"Reached its conclusion." },
  { value:"Killed", label:"Kill", color:"#E63232", hint:"No signal. Stop now." },
];

export default function MonthlyReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, bets, evidence, addEvidence, updateBet, addBet } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const activeBets = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");

  const [betId, setBetId] = useState(activeBets[0]?.id || "");
  const [outcome, setOutcome] = useState<BetStatus>("Active");
  const [actual, setActual] = useState("");
  const [insight, setInsight] = useState("");
  const [action, setAction] = useState("");
  const [newHyp, setNewHyp] = useState("");
  const [saving, setSaving] = useState(false);

  const bet = bets.find(b => b.id === betId);
  const lastEv = evidence.filter(e => e.bet_id === betId).sort((a,z) => new Date(z.created_at).getTime() - new Date(a.created_at).getTime())[0];

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!org || !bet) return;
    setSaving(true);
    const date = new Date().toISOString().split("T")[0];
    // Insert evidence
    const { data: ev } = await supabase.from("evidence").insert({
      org_id: org.id, bet_id: betId, date, actual, insight, new_status: outcome, action
    }).select().single();
    if (ev) addEvidence(ev);
    // Update bet
    const updatedBet = {
      ...bet, status: outcome,
      last_reviewed: date,
      last_note: insight.slice(0, 80),
      ...(outcome === "Pivoted" && newHyp ? { hypothesis: newHyp } : {}),
    };
    await supabase.from("bets").update({
      status: outcome, last_reviewed: date,
      last_note: insight.slice(0, 80),
      ...(outcome === "Pivoted" && newHyp ? { hypothesis: newHyp } : {}),
    }).eq("id", betId);
    updateBet(updatedBet);
    // Generate draft if scaled/pivoted
    if (outcome === "Scaled" || outcome === "Pivoted") {
      const nextSprint = sprints.find(s => s.status === "Planned");
      const draftHyp = outcome === "Pivoted" && newHyp ? newHyp : bet.hypothesis;
      const { data: draft } = await supabase.from("bets").insert({
        org_id: org.id,
        sprint_id: nextSprint?.id || bet.sprint_id,
        name: `${bet.name} — ${outcome === "Scaled" ? "Scale" : "Pivot"}`,
        owner_area: bet.owner_area, owner_contact: bet.owner_contact,
        status: "Active", signal: "Unclear",
        outcome: bet.outcome, hypothesis: draftHyp,
        indicators: bet.indicators, kill_criteria: bet.kill_criteria,
        scale_trigger: bet.scale_trigger, alignment: bet.alignment,
        revenue: bet.revenue, margin: bet.margin, importance: bet.importance,
        is_draft: true, source_bet_id: bet.id,
        last_note: `Draft generated from ${outcome} of ${bet.name}`,
      }).select().single();
      if (draft) addBet(draft);
    }
    setSaving(false);
    router.push(`/${params.orgSlug}/dashboard`);
  }

  return (
    <div className="p-10 max-w-2xl">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Monthly Review</h1>
        <p className="text-sm text-gray-400 mt-0.5">Evaluate evidence. Make a decision.</p>
      </div>
      <form onSubmit={save} className="space-y-5">
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Bet</label>
          <select value={betId} onChange={e => setBetId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] bg-white">
            {activeBets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {bet && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1">Hypothesis</div>
              <div className="text-sm text-gray-600">{bet.hypothesis}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-red-300 mb-1">Kill if</div>
                <div className="text-sm text-gray-500">{bet.kill_criteria || "—"}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-green-400 mb-1">Scale when</div>
                <div className="text-sm text-gray-500">{bet.scale_trigger || "—"}</div>
              </div>
            </div>
          </div>
        )}
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">What actually happened?</label>
          <textarea value={actual} onChange={e => setActual(e.target.value)} rows={3} required
            placeholder="e.g. AI usage at 52% in squads A and B, Squad C at 18%"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Insight — what does this tell us?</label>
          <textarea value={insight} onChange={e => setInsight(e.target.value)} rows={3} required
            placeholder="What did we learn?"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-2">Decision</label>
          <div className="space-y-2">
            {OUTCOMES.map(o => (
              <button key={o.value} type="button" onClick={() => setOutcome(o.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  outcome === o.value ? "border-2" : "border border-gray-100 hover:bg-gray-50"
                }`}
                style={outcome === o.value ? {borderColor: o.color, background: `${o.color}08`} : {}}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: o.color}} />
                <div>
                  <div className="font-mono text-sm font-semibold text-ink">{o.label}</div>
                  <div className="text-xs text-gray-400">{o.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {outcome === "Pivoted" && (
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Updated Hypothesis</label>
            <textarea value={newHyp} onChange={e => setNewHyp(e.target.value)} rows={3}
              placeholder="New direction for the next sprint..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
          </div>
        )}
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Next Action</label>
          <input value={action} onChange={e => setAction(e.target.value)} placeholder="One concrete step"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-mono text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Log Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
