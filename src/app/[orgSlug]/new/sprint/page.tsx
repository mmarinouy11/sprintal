"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

export default function NewSprintPage() {
  const router = useRouter();
  const params = useParams();
  const { org, addSprint } = useStore();
  const [form, setForm] = useState({ name:"", start_date:"", end_date:"", focus:"", signals:"", status:"Planned" });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!org) return;
    setSaving(true);
    const { data } = await supabase.from("sprints")
      .insert({ ...form, org_id: org.id }).select().single();
    if (data) { addSprint(data); router.push(`/${params.orgSlug}/sprints`); }
    setSaving(false);
  }

  return (
    <div className="p-10 max-w-2xl">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">New Enterprise Sprint</h1>
        <p className="text-sm text-gray-400 mt-0.5">Set the strategic direction for the next 90 days.</p>
      </div>
      <form onSubmit={save} className="space-y-5">
        {[
          { label:"Sprint Name", key:"name", type:"input", placeholder:"e.g. Q2 FY27 Sprint" },
          { label:"Start Date", key:"start_date", type:"date" },
          { label:"End Date", key:"end_date", type:"date" },
        ].map(f => (
          <div key={f.key}>
            <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">{f.label}</label>
            <input type={f.type === "date" ? "date" : "text"} value={form[f.key as keyof typeof form]}
              onChange={set(f.key)} placeholder={f.placeholder}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" required />
          </div>
        ))}
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Strategic Focus <span className="text-gray-300">(max 3 priorities)</span></label>
          <textarea value={form.focus} onChange={set("focus")} rows={3}
            placeholder="What matters most this cycle?"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" required />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Success Signals <span className="text-gray-300">(separate with ·)</span></label>
          <textarea value={form.signals} onChange={set("signals")} rows={2}
            placeholder="e.g. Increased AI adoption · Stronger pipeline"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] resize-none" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Status</label>
          <select value={form.status} onChange={set("status")}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00] bg-white">
            <option>Planned</option><option>Active</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-mono text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
            {saving ? "Creating..." : "Create Sprint"}
          </button>
        </div>
      </form>
    </div>
  );
}
