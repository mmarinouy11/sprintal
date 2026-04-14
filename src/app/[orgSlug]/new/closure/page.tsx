"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { BetStatus } from "@/types";

const OUTCOMES: BetStatus[] = ["Scaled","Pivoted","Done","Killed"];

export default function SprintClosurePage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, bets, updateSprint, updateBet, addBet } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const sprintBets = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const nextSprint = sprints.find(s => s.status === "Planned");
  const [outcomes, setOutcomes] = useState<Record<string,BetStatus>>({});
  const [learnings, setLearnings] = useState<Record<string,string>>({});
  const [newHyps, setNewHyps] = useState<Record<string,string>>({});
  const [closure, setClosure] = useState({ worked:"", didnt:"", surprised:"", hr:"", tag:"", ld:"", mkt:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!active) return (
    <div className="p-10"><p className="font-mono text-gray-400">No active sprint to close.</p></div>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const missing = sprintBets.filter(b => !outcomes[b.id]);
    if (missing.length) { setError(`Please select an outcome for: ${missing.map(b=>b.name).join(", ")}`); return; }
    setSaving(true);
    const date = new Date().toISOString().split("T")[0];
    for (const b of sprintBets) {
      const outcome = outcomes[b.id];
      const learning = learnings[b.id] || "";
      const newHyp = newHyps[b.id] || "";
      await supabase.from("bets").update({
        status: outcome, last_reviewed: date,
        last_note: learning, closure_learning: learning,
        ...(outcome === "Pivoted" && newHyp ? { hypothesis: newHyp } : {}),
      }).eq("id", b.id);
      updateBet({ ...b, status: outcome, last_reviewed: date, last_note: learning });
      if (outcome === "Scaled" || outcome === "Pivoted") {
        const { data: draft } = await supabase.from("bets").insert({
          org_id: org!.id, sprint_id: nextSprint?.id || b.sprint_id,
          name: `${b.name} — ${outcome === "Scaled" ? "Scale" : "Pivot"}`,
          owner_area: b.owner_area, owner_contact: b.owner_contact,
          status: "Active", signal: "Unclear",
          outcome: b.outcome, hypothesis: outcome === "Pivoted" && newHyp ? newHyp : b.hypothesis,
          indicators: b.indicators, kill_criteria: b.kill_criteria, scale_trigger: b.scale_trigger,
          alignment: b.alignment, revenue: b.revenue, margin: b.margin, importance: b.importance,
          is_draft: true, source_bet_id: b.id,
          last_note: `Draft from ${outcome} of ${b.name}`,
        }).select().single();
        if (draft) addBet(draft);
      }
    }
    const closureData = { ...closure, date };
    await supabase.from("sprints").update({ status: "Closed", closure: closureData }).eq("id", active.id);
    updateSprint({ ...active, status: "Closed", closure: closureData });
    setSaving(false);
    router.push(`/${params.orgSlug}/sprints`);
  }

  return (
    <div className="p-10 max-w-3xl pb-20">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Close Sprint</h1>
        <p className="text-sm text-gray-400 mt-0.5">Closing: {active.name} · Closure is not reporting — it's reconfiguration.</p>
      </div>
      <form onSubmit={save}>
        {/* Bet outcomes */}
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-300 mb-4">Bet Outcomes</div>
        <div className="space-y-4 mb-8">
          {sprintBets.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-mono font-semibold text-ink">{b.name}</div>
                  <div className="text-xs text-gray-400">{b.owner_area} · {b.owner_contact}</div>
                </div>
                <div className="text-sm font-medium" style={{color: b.signal === "Strong" ? "#00C864" : b.signal === "Weak" ? "#E63232" : "#EAA012"}}>
                  ● {b.signal}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1">Outcome</label>
                  <select value={outcomes[b.id] || ""} onChange={e => setOutcomes(o => ({...o, [b.id]: e.target.value as BetStatus}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] bg-white">
                    <option value="">— Select outcome —</option>
                    {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1">Key Learning</label>
                  <input value={learnings[b.id]||""} onChange={e => setLearnings(l=>({...l,[b.id]:e.target.value}))}
                    placeholder="What did this bet teach us?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
                </div>
              </div>
              {outcomes[b.id] === "Pivoted" && (
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1">Updated Hypothesis</label>
                  <input value={newHyps[b.id]||""} onChange={e => setNewHyps(h=>({...h,[b.id]:e.target.value}))}
                    placeholder="New direction for the next sprint..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Sprint learnings */}
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-300 mb-4">Sprint Learnings</div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[["What worked?","worked"],["What didn't?","didnt"],["What surprised us?","surprised"]].map(([label,key]) => (
            <div key={key}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1.5">{label}</label>
              <textarea value={closure[key as keyof typeof closure]} onChange={e => setClosure(c=>({...c,[key]:e.target.value}))}
                rows={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
            </div>
          ))}
        </div>
        {/* Capability decisions */}
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-300 mb-4">Capability Decisions</div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[["HR","hr"],["TAG — Recruiting","tag"],["L&D","ld"],["Marketing","mkt"]].map(([label,key]) => (
            <div key={key}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1.5">{label}</label>
              <input value={closure[key as keyof typeof closure]} onChange={e => setClosure(c=>({...c,[key]:e.target.value}))}
                placeholder={`Actions for ${label}`}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-mono text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
            {saving ? "Closing..." : "Close Sprint"}
          </button>
        </div>
      </form>
    </div>
  );
}
