"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { SignalStrength } from "@/types";

const SIGNALS: { value: SignalStrength; label: string; color: string }[] = [
  { value:"Strong", label:"Strong", color:"#00C864" },
  { value:"Unclear", label:"Unclear", color:"#EAA012" },
  { value:"Weak", label:"Weak", color:"#E63232" },
];

export default function SignalCheckPage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, bets, addSignalCheck, updateBet } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const activeBets = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const [betId, setBetId] = useState(activeBets[0]?.id || "");
  const [signal, setSignal] = useState<SignalStrength>("Unclear");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const bet = bets.find(b => b.id === betId);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!org || !bet) return;
    setSaving(true);
    const date = new Date().toISOString().split("T")[0];
    const { data: sc } = await supabase.from("signal_checks").insert({
      org_id: org.id, bet_id: betId, date,
      prev_signal: bet.signal, signal, note,
    }).select().single();
    if (sc) addSignalCheck(sc);
    await supabase.from("bets").update({ signal }).eq("id", betId);
    updateBet({ ...bet, signal });
    setSaving(false);
    router.push(`/${params.orgSlug}/dashboard`);
  }

  return (
    <div className="p-10 max-w-xl">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Signal Check</h1>
        <p className="text-sm text-gray-400 mt-0.5">Lightweight checkpoint. Not a decision meeting.</p>
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
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-300">Current signal</span>
              <span className="font-semibold text-sm" style={{color: SIGNALS.find(s=>s.value===bet.signal)?.color}}>
                ● {bet.signal}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-[10px] text-red-300 uppercase tracking-widest mb-1">Kill if</div>
                <div className="text-xs text-gray-500">{bet.kill_criteria || "—"}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-green-400 uppercase tracking-widest mb-1">Scale when</div>
                <div className="text-xs text-gray-500">{bet.scale_trigger || "—"}</div>
              </div>
            </div>
          </div>
        )}
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-2">Updated Signal</label>
          <div className="flex gap-3">
            {SIGNALS.map(s => (
              <button key={s.value} type="button" onClick={() => setSignal(s.value)}
                className={`flex-1 py-2.5 rounded-xl font-mono text-sm font-semibold border-2 transition-colors`}
                style={signal === s.value
                  ? {borderColor: s.color, background: `${s.color}12`, color: s.color}
                  : {borderColor: "#e5e7eb", color: "#9ca3af"}}>
                ● {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Note <span className="text-gray-300">(optional)</span></label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="What changed or caught your attention?"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-mono text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save Signal Check"}
          </button>
        </div>
      </form>
    </div>
  );
}
