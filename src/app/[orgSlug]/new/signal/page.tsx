"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal, { Field, ModalFooter } from "@/components/ui/Modal";
import type { SignalStrength } from "@/types";

const SIGNALS: { value: SignalStrength; label: string; color: string; desc: string }[] = [
  { value:"Strong",  label:"Strong",  color:"var(--strong)",  desc:"Evidence is accumulating. Hypothesis looks valid." },
  { value:"Unclear", label:"Unclear", color:"var(--unclear)", desc:"Mixed signals. Not enough data to decide." },
  { value:"Weak",    label:"Weak",    color:"var(--weak)",    desc:"Hypothesis is not holding. Consider killing." },
];

const SIDEBAR = (
  <div>
    <div className="font-mono text-xs font-semibold tracking-wide mb-1" style={{ color:"var(--brand)" }}>Signal Check</div>
    <div className="font-bold text-xl mb-2" style={{ color:"var(--text)", letterSpacing:"-0.02em" }}>Read the Signal</div>
    <p className="text-sm mb-6" style={{ color:"var(--t2)", lineHeight:1.6 }}>
      A lightweight awareness checkpoint — not a decision meeting. No status changes. Just signal strength.
    </p>
    <div className="mb-5">
      <div className="font-semibold text-sm mb-3" style={{ color:"var(--text)" }}>Signal Meanings</div>
      {SIGNALS.map(s => (
        <div key={s.value} className="mb-3 pl-3" style={{ borderLeft:`2px solid ${s.color}` }}>
          <div className="font-semibold text-sm mb-0.5" style={{ color:s.color }}>{s.label}</div>
          <div style={{ fontSize:"0.8125rem", color:"var(--t2)" }}>{s.desc}</div>
        </div>
      ))}
    </div>
    <div className="pt-4" style={{ borderTop:"1px solid var(--border)" }}>
      <div className="font-semibold text-sm mb-2" style={{ color:"var(--text)" }}>Cadence</div>
      <p style={{ fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>
        Signal Checks happen at the midpoint between Strategic Reviews — roughly twice per review interval. Keep it short: signal + one observation.
      </p>
    </div>
  </div>
);

export default function SignalCheckPage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, bets, addSignalCheck, updateBet } = useStore();
  const active = sprints.find(s=>s.status==="Active");
  const activeBets = bets.filter(b=>b.sprint_id===active?.id && b.status==="Active");
  const [betId, setBetId] = useState(activeBets[0]?.id||"");
  const [signal, setSignal] = useState<SignalStrength>("Unclear");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const bet = bets.find(b=>b.id===betId);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!org||!bet) return;
    setSaving(true);
    const date = new Date().toISOString().split("T")[0];
    const { data: sc } = await supabase.from("signal_checks").insert({
      org_id:org.id, bet_id:betId, date, prev_signal:bet.signal, signal, note,
    }).select().single();
    if (sc) addSignalCheck(sc);
    const { error: updateError } = await supabase.from("bets").update({ signal }).eq("id", betId);
    if (!updateError) updateBet({ ...bet, signal });
    setSaving(false);
    router.push(`/${params.orgSlug}/dashboard`);
  }

  return (
    <Modal title="Signal Check" subtitle="Lightweight checkpoint. Not a decision meeting." sidebar={SIDEBAR}>
      <form onSubmit={save}>
        <Field label="Bet">
          <select className="input" value={betId} onChange={e=>setBetId(e.target.value)}>
            {activeBets.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        {bet && (
          <div className="rounded p-4 mb-4" style={{ background:"var(--raised)", border:"1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="t-label">Current signal</span>
              <span className="font-medium text-sm" style={{ color:`var(--${bet.signal.toLowerCase()})` }}>● {bet.signal}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="t-label mb-1" style={{ color:"var(--killed)" }}>Kill if</div>
                <div className="text-sm" style={{ color:"var(--t2)" }}>{bet.kill_criteria||"—"}</div>
              </div>
              <div>
                <div className="t-label mb-1" style={{ color:"var(--scaled)" }}>Scale when</div>
                <div className="text-sm" style={{ color:"var(--t2)" }}>{bet.scale_trigger||"—"}</div>
              </div>
            </div>
          </div>
        )}
        <Field label="Updated Signal">
          <div className="flex gap-2">
            {SIGNALS.map(s => (
              <button key={s.value} type="button" onClick={()=>setSignal(s.value)}
                className="flex-1 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  fontFamily:"var(--font-mono)", border:"1.5px solid",
                  borderColor: signal===s.value ? s.color : "var(--border-mid)",
                  background: signal===s.value ? `color-mix(in srgb, ${s.color} 10%, transparent)` : "transparent",
                  color: signal===s.value ? s.color : "var(--t3)",
                }}>
                ● {s.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Note" hint="optional">
          <textarea className="input" rows={3} value={note} onChange={e=>setNote(e.target.value)}
            placeholder="What changed or caught your attention?" />
        </Field>
        <ModalFooter>
          <button type="button" onClick={()=>router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?"Saving...":"Save Signal Check →"}</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
