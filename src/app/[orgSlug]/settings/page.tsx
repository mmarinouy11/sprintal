"use client";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function SettingsPage() {
  const { org, setOrg } = useStore();
  const [name, setName] = useState(org?.name || "");
  const [color, setColor] = useState(org?.primary_color || "#AADC00");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!org) return;
    setSaving(true);
    const { data } = await supabase
      .from("organizations")
      .update({ name, primary_color: color })
      .eq("id", org.id)
      .select()
      .single();
    if (data) setOrg(data);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-10 max-w-lg">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Organization & branding</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Organization Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#AADC00]" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">Brand Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-gray-200" />
            <input value={color} onChange={e => setColor(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#AADC00]" />
          </div>
        </div>
        <div className="pt-2">
          <div className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-2">Current Plan</div>
          <div className="flex items-center gap-3">
            <span className="bg-[#AADC00]/10 text-[#88B200] font-mono text-xs font-semibold px-3 py-1 rounded border border-[#AADC00]/20">
              {org?.plan?.toUpperCase() || "TRIAL"}
            </span>
            {org?.plan === "trial" && (
              <span className="text-xs text-gray-400">
                Trial ends {new Date(org.trial_ends_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
