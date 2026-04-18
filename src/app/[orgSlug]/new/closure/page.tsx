"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal, { Field, FieldRow, ModalFooter } from "@/components/ui/Modal";
import type { BetStatus } from "@/types";

const OUTCOMES: BetStatus[] = ["Scaled","Pivoted","Done","Killed"];
const OUTCOME_COLORS: Record<string,string> = {
  Scaled:"var(--scaled)", Pivoted:"var(--pivoted)", Done:"var(--done)", Killed:"var(--killed)"
};


const SIDEBAR = (
  <div>
    <div className="font-mono text-xs font-semibold tracking-wide mb-1" style={{ color:"var(--brand)" }}>Sprint Closure</div>
    <div className="font-bold text-xl mb-2" style={{ color:"var(--text)", letterSpacing:"-0.02em" }}>Close the Sprint</div>
    <p className="text-sm mb-6" style={{ color:"var(--t2)", lineHeight:1.6 }}>
      Closure is not reporting — it is reconfiguration. Decide what to carry forward, what to stop, and what the next cycle needs.
    </p>
    <div className="mb-5">
      <div className="font-semibold text-sm mb-3" style={{ color:"var(--text)" }}>Bet Outcomes</div>
      {[
        { c:"var(--scaled)",  t:"Scale",        d:"Generates a draft bet for expansion into the next sprint." },
        { c:"var(--pivoted)", t:"Pivot",         d:"Generates a draft with updated hypothesis for the next sprint." },
        { c:"var(--done)",    t:"Mark as Done",  d:"Reached its conclusion. No continuation." },
        { c:"var(--killed)",  t:"Kill",          d:"No signal. Stop completely." },
      ].map(o => (
        <div key={o.t} className="mb-3 pl-3" style={{ borderLeft:`2px solid ${o.c}` }}>
          <div className="font-semibold text-sm mb-0.5" style={{ color:o.c }}>{o.t}</div>
          <div style={{ fontSize:"0.8125rem", color:"var(--t2)" }}>{o.d}</div>
        </div>
      ))}
    </div>
    <div className="pt-4" style={{ borderTop:"1px solid var(--border)" }}>
      <div className="font-semibold text-sm mb-2" style={{ color:"var(--text)" }}>Capability Decisions</div>
      <p style={{ fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>
        For each function, define what needs to change to support the next sprint. These are structural actions, not tasks.
      </p>
    </div>
  </div>
);

export default function SprintClosurePage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, bets, updateSprint, updateBet, addBet } = useStore();
  const active = sprints.find(s=>s.status==="Active");
  const sprintBets = bets.filter(b=>b.sprint_id===active?.id && b.status==="Active");
  const nextSprint = sprints.find(s=>s.status==="Planned");
  const [outcomes, setOutcomes] = useState<Record<string,BetStatus>>({});
  const [learnings, setLearnings] = useState<Record<string,string>>({});
  const [newHyps, setNewHyps] = useState<Record<string,string>>({});
  const [closure, setClosure] = useState({worked:"",didnt:"",surprised:"",hr:"",tag:"",ld:"",mkt:""});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!active) return (
    <Modal title="Close Sprint" subtitle="No active sprint to close.">
      <p className="t-mono" style={{color:"var(--t3)"}}>No active sprint found.</p>
    </Modal>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    const missing = sprintBets.filter(b=>!outcomes[b.id]);
    if (missing.length) { setError(`Select an outcome for: ${missing.map(b=>b.name).join(", ")}`); return; }
    setSaving(true);
    const date = new Date().toISOString().split("T")[0];
    for (const b of sprintBets) {
      const outcome = outcomes[b.id];
      const learning = learnings[b.id]||"";
      const newHyp = newHyps[b.id]||"";
      await supabase.from("bets").update({
        status:outcome, last_reviewed:date, last_note:learning, closure_learning:learning,
        ...(outcome==="Pivoted"&&newHyp ? {hypothesis:newHyp} : {}),
      }).eq("id", b.id);
      updateBet({...b,status:outcome,last_reviewed:date,last_note:learning});
      if (outcome==="Scaled"||outcome==="Pivoted") {
        const { data: draft } = await supabase.from("bets").insert({
          org_id:org!.id, sprint_id:nextSprint?.id||b.sprint_id,
          name:`${b.name} — ${outcome==="Scaled"?"Scale":"Pivot"}`,
          owner_area:b.owner_area, owner_contact:b.owner_contact,
          status:"Active", signal:"Unclear", outcome:b.outcome,
          hypothesis:outcome==="Pivoted"&&newHyp ? newHyp : b.hypothesis,
          indicators:b.indicators, kill_criteria:b.kill_criteria,
          scale_trigger:b.scale_trigger, alignment:b.alignment,
          revenue:b.revenue, margin:b.margin, importance:b.importance,
          is_draft:true, source_bet_id:b.id,
          last_note:`Draft from ${outcome} of ${b.name}`,
        }).select().single();
        if (draft) addBet(draft);
      }
    }
    const closureData = {...closure, date};
    await supabase.from("sprints").update({status:"Closed",closure:closureData}).eq("id",active.id);
    updateSprint({...active,status:"Closed",closure:closureData});
    setSaving(false);
    router.push(`/${params.orgSlug}/sprints`);
  }

  return (
    <Modal title="Close Sprint" subtitle={`Closing: ${active.name}, Closure is reconfiguration, not reporting.`} wide>
      <form onSubmit={save}>
        <div className="t-label mb-3">Bet Outcomes</div>
        <div className="space-y-3 mb-6">
          {sprintBets.map(b=>(
            <div key={b.id} className="rounded p-4"
              style={{background:"var(--raised)",border:"1px solid var(--border)"}}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm" style={{color:"var(--text)"}}>{b.name}</div>
                  <div className="t-mono">{b.owner_area}, {b.owner_contact}</div>
                </div>
                <span className="t-mono font-medium" style={{color:`var(--${b.signal.toLowerCase()})`}}>● {b.signal}</span>
              </div>
              <FieldRow>
                <Field label="Outcome">
                  <select className="input"
                    value={outcomes[b.id]||""}
                    onChange={e=>setOutcomes(o=>({...o,[b.id]:e.target.value as BetStatus}))}>
                    <option value="">— Select outcome —</option>
                    {OUTCOMES.map(o=>(
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Key Learning">
                  <input className="input" value={learnings[b.id]||""}
                    onChange={e=>setLearnings(l=>({...l,[b.id]:e.target.value}))}
                    placeholder="What did this bet teach us?" />
                </Field>
              </FieldRow>
              {outcomes[b.id]==="Pivoted" && (
                <Field label="Updated Hypothesis">
                  <input className="input" value={newHyps[b.id]||""}
                    onChange={e=>setNewHyps(h=>({...h,[b.id]:e.target.value}))}
                    placeholder="New direction for the next sprint..." />
                </Field>
              )}
            </div>
          ))}
        </div>
        <div className="t-label mb-3">Sprint Learnings</div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[["What worked?","worked"],["What didn't?","didnt"],["Surprises?","surprised"]].map(([label,key])=>(
            <Field key={key} label={label}>
              <textarea className="input" rows={3}
                value={closure[key as keyof typeof closure]}
                onChange={e=>setClosure(c=>({...c,[key]:e.target.value}))} />
            </Field>
          ))}
        </div>
        <div className="t-label mb-3">Capability Decisions</div>
        <div className="grid grid-cols-2 gap-4 mb-2">
          {[["HR","hr"],["TAG","tag"],["L&D","ld"],["Marketing","mkt"]].map(([label,key])=>(
            <Field key={key} label={label}>
              <input className="input" value={closure[key as keyof typeof closure]}
                onChange={e=>setClosure(c=>({...c,[key]:e.target.value}))}
                placeholder={`Actions for ${label}`} />
            </Field>
          ))}
        </div>
        {error && <p className="t-mono mb-4" style={{color:"var(--killed)"}}>{error}</p>}
        <ModalFooter>
          <button type="button" onClick={()=>router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Closing..." : "Close Sprint →"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
