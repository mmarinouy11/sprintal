"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { AREAS } from "@/lib/utils";

export default function NewBetPage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, addBet } = useStore();
  const [saving, setSaving] = useState(false);
  const [alignment, setAlignment] = useState<string[]>([]);
  const [form, setForm] = useState({
    sprint_id: sprints.find(s=>s.status==="Active")?.id || sprints[0]?.id || "",
    status:"Active", owner_area:"", owner_contact:"", name:"", outcome:"",
    why_now:"", hypothesis:"", indicators:"", kill_criteria:"", scale_trigger:"",
    revenue:"Medium", margin:"Medium", importance:"Medium",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function toggleAlignment(a: string) {
    setAlignment(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!org) return;
    setSaving(true);
    const indicators = form.indicators.split(",").map(s=>s.trim()).filter(Boolean).slice(0,3);
    const { data } = await supabase.from("bets").insert({
      ...form, org_id: org.id, indicators, alignment,
      signal: "Unclear", is_draft: false,
    }).select().single();
    if (data) { addBet(data); router.push(`/${params.orgSlug}/bets/board`); }
    setSaving(false);
  }

  return (
    <div className="p-10 max-w-2xl">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">New Strategic Bet</h1>
        <p className="text-sm text-gray-400 mt-0.5">A Bet is a testable hypothesis — not a project.</p>
      </div>
      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Sprint</label>
            <select value={form.sprint_id} onChange={set("sprint_id")}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] bg-white">
              {sprints.filter(s=>s.status!=="Closed").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Owner Area</label>
            <select value={form.owner_area} onChange={set("owner_area")}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] bg-white" required>
              <option value="">— Select —</option>
              <optgroup label="Market Units">
                {["MU-1","MU-2","MU-3","MU-4"].map(a=><option key={a}>{a}</option>)}
              </optgroup>
              <optgroup label="Functions">
                {["HR","TAG","L&D","Marketing","Delivery"].map(a=><option key={a}>{a}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Point of Contact</label>
          <input value={form.owner_contact} onChange={set("owner_contact")} placeholder="Name or role"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Bet Name</label>
          <input value={form.name} onChange={set("name")} placeholder="e.g. AI-Assisted Delivery Pods" required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Strategic Outcome</label>
          <input value={form.outcome} onChange={set("outcome")} placeholder="Measurable change in 90 days" required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Why Now</label>
          <input value={form.why_now} onChange={set("why_now")} placeholder="Why is this the right moment?"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Hypothesis <span className="text-gray-300">If X → Y → measured by Z</span></label>
          <textarea value={form.hypothesis} onChange={set("hypothesis")} rows={3} required
            placeholder="If we do X, we believe Y will happen, measured by Z"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Leading Indicators <span className="text-gray-300">comma-separated, max 3</span></label>
          <textarea value={form.indicators} onChange={set("indicators")} rows={2}
            placeholder="AI usage rate >60%, Cycle time reduction, Dev satisfaction ↑"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Kill Criteria</label>
            <input value={form.kill_criteria} onChange={set("kill_criteria")} placeholder="When do we stop?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Scale Trigger</label>
            <input value={form.scale_trigger} onChange={set("scale_trigger")} placeholder="When do we double down?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-2">Support & Alignment Required</label>
          <div className="flex flex-wrap gap-2">
            {AREAS.map(a => (
              <button key={a} type="button" onClick={() => toggleAlignment(a)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium border transition-colors ${
                  alignment.includes(a)
                    ? "bg-[#AADC00]/10 text-[#88B200] border-[#AADC00]/30"
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[["Revenue Impact","revenue"],["Margin Impact","margin"],["Strategic Importance","importance"]].map(([label, key]) => (
            <div key={key}>
              <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
              <select value={form[key as keyof typeof form]} onChange={set(key)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] bg-white">
                <option>Medium</option><option>High</option><option>Low</option>
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-mono text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
            {saving ? "Creating..." : "Create Bet"}
          </button>
        </div>
      </form>
    </div>
  );
}
