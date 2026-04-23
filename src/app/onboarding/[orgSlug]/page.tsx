"use client";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

const BRAND_PRESETS = [
  { label:"Indigo",      hex:"#5C6AC4" },
  { label:"Teal",        hex:"#0F766E" },
  { label:"Violet",      hex:"#7C3AED" },
  { label:"Rose",        hex:"#E11D48" },
  { label:"Amber",       hex:"#B45309" },
  { label:"Sky",         hex:"#0284C7" },
  { label:"Emerald",     hex:"#22C55E" },
  { label:"Slate",       hex:"#475569" },
];

const DEFAULT_AREAS = [
  { id:"1", name:"MU-1", type:"Market Unit" },
  { id:"2", name:"MU-2", type:"Market Unit" },
  { id:"3", name:"HR",   type:"Function" },
  { id:"4", name:"TAG",  type:"Function" },
  { id:"5", name:"L&D",  type:"Function" },
];

type Area = { id: string; name: string; type: string };

const STEPS = [
  { num: 1, label: "Brand",   sub: "Logo & color" },
  { num: 2, label: "Areas",   sub: "Your org units" },
  { num: 3, label: "Sprint",  sub: "First sprint" },
  { num: 4, label: "Bets",    sub: "Strategic bets" },
];

export default function OnboardingPage() {
  const params = useParams();
  const { org: storeOrg, setOrg, addSprint, addBet } = useStore();
  const [org, setLocalOrg] = useState(storeOrg);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Load org directly if not in store (onboarding is outside the layout)
  useEffect(() => {
    if (org) return;
    async function loadOrg() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/auth/login"; return; }
      const { data } = await supabase
        .from("organizations").select("*")
        .eq("slug", params.orgSlug as string).limit(1).then((r: any) => ({ data: r.data?.[0] ?? null, error: r.error }));
      if (data) { setLocalOrg(data); setOrg(data); }
    }
    loadOrg();
  }, []);

  // Sync local org with store
  function updateOrg(data: typeof org) {
    setLocalOrg(data);
    setOrg(data!);
  }

  // Step 1 — Brand
  const [brandColor, setBrandColor] = useState("#5C6AC4");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — Areas
  const [areas, setAreas] = useState<Area[]>(DEFAULT_AREAS);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState("Market Unit");

  // Step 3 — Sprint
  const [sprint, setSprint] = useState({
    name: "Q1 Sprint",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    focus: "",
    signals: "",
  });

  // Step 4 — Bets
  const [bets, setBets] = useState([
    { id:"1", name:"", outcome:"", hypothesis:"", owner_area:"", signal:"Unclear" },
  ]);
  const [sprintId, setSprintId] = useState("");

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function addArea() {
    if (!newAreaName.trim()) return;
    setAreas(prev => [...prev, { id: Date.now().toString(), name: newAreaName.trim(), type: newAreaType }]);
    setNewAreaName("");
  }

  function removeArea(id: string) {
    setAreas(prev => prev.filter(a => a.id !== id));
  }

  function addBetRow() {
    setBets(prev => [...prev, { id: Date.now().toString(), name:"", outcome:"", hypothesis:"", owner_area:"", signal:"Unclear" }]);
  }

  function updateBet(id: string, key: string, val: string) {
    setBets(prev => prev.map(b => b.id === id ? { ...b, [key]: val } : b));
  }

  function removeBet(id: string) {
    setBets(prev => prev.filter(b => b.id !== id));
  }

  async function saveBrand() {
    if (!org) return;
    setSaving(true);
    let logo_url = org.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${org.id}/logo.${ext}`;
      await supabase.storage.from("logos").upload(path, logoFile, { upsert: true });
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      logo_url = data.publicUrl;
    }
    const { data } = await supabase.from("organizations")
      .update({ primary_color: brandColor, logo_url })
      .eq("id", org.id).select().limit(1).maybeSingle();
    if (data) updateOrg(data);
    setSaving(false);
    setStep(2);
  }

  async function saveSprint() {
    if (!org) return;
    setSaving(true);

    // Guard — if active sprint already exists, reuse it instead of creating a new one
    const { data: existing } = await supabase
      .from("sprints")
      .select("id, name")
      .eq("org_id", org.id)
      .eq("status", "Active")
      .maybeSingle();

    if (existing) {
      setSprintId(existing.id);
      setSaving(false);
      setStep(4);
      return;
    }

    const { data } = await supabase.from("sprints").insert({
      ...sprint, org_id: org.id, status: "Active",
    }).select().limit(1).maybeSingle();
    if (data) { addSprint(data); setSprintId(data.id); }
    setSaving(false);
    setStep(4);
  }

  async function finalize() {
    if (!org || !sprintId) return;
    setSaving(true);

    const validBets = bets.filter(b => b.name.trim());
    for (const b of validBets) {
      const { data } = await supabase.from("bets").insert({
        org_id: org.id,
        sprint_id: sprintId,
        name: b.name,
        outcome: b.outcome,
        hypothesis: b.hypothesis,
        owner_area: b.owner_area || areas[0]?.name || "",
        owner_contact: "",
        status: "Active",
        signal: "Unclear",
        indicators: [],
        alignment: [],
        revenue: "Medium",
        margin: "Medium",
        importance: "Medium",
        is_draft: false,
      }).select().limit(1).maybeSingle();
      if (data) addBet(data);
    }
    // Mark onboarding complete
    const { error: updateError } = await supabase.from("organizations")
      .update({ onboarding_complete: true })
      .eq("id", org.id);
    
    if (updateError) {
      console.error("Failed to mark onboarding complete:", updateError);
      setSaving(false);
      return;
    }

    setSaving(false);
    // Navigate to dashboard — onboarding is outside the layout so no loop risk
    window.location.href = `/${params.orgSlug}/dashboard`;
  }

  const bc = brandColor;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="px-10 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="font-bold text-xl tracking-tight" style={{ color: bc, letterSpacing: "-0.02em" }}>
          Sprintal
        </div>
        <div className="t-label">Setup, {step} of {STEPS.length}</div>
      </div>

      <div className="flex-1 flex">
        {/* Left stepper */}
        <div className="w-60 px-8 py-10 flex-shrink-0" style={{ borderRight: "1px solid var(--border)" }}>
          <div className="space-y-1">
            {STEPS.map(s => {
              const done = step > s.num;
              const active = step === s.num;
              return (
                <div key={s.num} className="flex items-center gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors"
                    style={{
                      background: done ? bc : active ? bc : "var(--raised)",
                      color: (done || active) ? "#fff" : "var(--t3)",
                      border: `1.5px solid ${done || active ? bc : "var(--border-mid)"}`,
                    }}>
                    {done ? "✓" : s.num}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: active ? "var(--text)" : "var(--t3)" }}>{s.label}</div>
                    <div className="t-mono text-xs">{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-start justify-center px-8 py-10">
          <div className="w-full max-w-xl">

            {/* ── STEP 1 — Brand ── */}
            {step === 1 && (
              <div className="fade-up">
                <div className="mb-8">
                  <div className="font-bold text-2xl tracking-tight mb-1" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    Brand your workspace
                  </div>
                  <div className="t-mono">Upload your logo and choose your accent color.</div>
                </div>

                {/* Logo upload */}
                <div className="mb-6">
                  <div className="t-label mb-3">Logo</div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "var(--raised)", border: "1px solid var(--border-mid)" }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                        : <span style={{ fontSize: "1.5rem", color: "var(--t2)" }}>🏢</span>
                      }
                    </div>
                    <div>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="btn-ghost text-sm mb-1">
                        {logoPreview ? "Change logo" : "Upload logo"}
                      </button>
                      <div className="t-mono text-xs">PNG, SVG or JPG, max 2MB</div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </div>
                  </div>
                </div>

                {/* Color picker */}
                <div className="mb-8">
                  <div className="t-label mb-3">Accent Color</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {BRAND_PRESETS.map(p => (
                      <button key={p.hex} type="button" onClick={() => setBrandColor(p.hex)}
                        className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors"
                        style={{
                          border: `1.5px solid ${brandColor === p.hex ? p.hex : "var(--border-mid)"}`,
                          background: brandColor === p.hex ? `${p.hex}12` : "var(--surface)",
                          color: brandColor === p.hex ? p.hex : "var(--t2)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                        }}>
                        <div className="w-3 h-3 rounded-full" style={{ background: p.hex }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer" style={{ border: "1px solid var(--border-mid)" }} />
                    <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                      className="input w-32" placeholder="#5C6AC4" style={{ fontFamily: "var(--font-mono)" }} />
                    <span className="t-mono">Custom hex</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded p-4 mb-8" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `2px solid ${bc}` }}>
                  <div className="t-label mb-2" style={{ color: bc }}>Preview</div>
                  <div className="font-bold text-lg" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    {org?.name || "Your Company"}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-20 h-1 rounded" style={{ background: bc }} />
                    <div className="t-mono text-xs" style={{ color: bc }}>Enterprise Sprinting</div>
                  </div>
                </div>

                <button onClick={saveBrand} disabled={saving} className="btn-primary w-full py-3"
                  style={{ background: bc }}>
                  {saving ? "Saving..." : "Continue →"}
                </button>
              </div>
            )}

            {/* ── STEP 2 — Areas ── */}
            {step === 2 && (
              <div className="fade-up">
                <div className="mb-8">
                  <div className="font-bold text-2xl tracking-tight mb-1" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    Define your areas
                  </div>
                  <div className="t-mono">Market units, functions, or any organizational unit that owns bets.</div>
                </div>

                <div className="space-y-2 mb-4">
                  {areas.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div>
                        <span className="font-medium text-sm" style={{ color: "var(--text)" }}>{a.name}</span>
                        <span className="badge ml-2" style={{ background: "var(--raised)", color: "var(--t2)", borderColor: "var(--border)" }}>{a.type}</span>
                      </div>
                      <button type="button" onClick={() => removeArea(a.id)}
                        className="t-mono text-xs transition-colors hover:text-red-500"
                        style={{ color: "var(--t2)", background: "none", border: "none", cursor: "pointer" }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add area */}
                <div className="rounded p-4 mb-8" style={{ background: "var(--raised)", border: "1px solid var(--border)" }}>
                  <div className="t-label mb-3">Add Area</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="t-label mb-1.5">Name</div>
                      <input className="input" value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
                        placeholder="e.g. MU-5 or Finance"
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addArea())} />
                    </div>
                    <div>
                      <div className="t-label mb-1.5">Type</div>
                      <select className="input" value={newAreaType} onChange={e => setNewAreaType(e.target.value)}>
                        <option>Market Unit</option>
                        <option>Function</option>
                        <option>Team</option>
                        <option>Squad</option>
                      </select>
                    </div>
                  </div>
                  <button type="button" onClick={addArea} className="btn-primary w-full mt-1">
                    + Add Area
                  </button>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
                  <button onClick={async () => {
                    if (!org) return;
                    setSaving(true);
                    // Get current session token
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) { setSaving(false); return; }

                    // Create each area as a sub-org
                    for (const a of areas) {
                      await fetch("/api/org/create-sub", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                          name:           a.name,
                          parentOrgId:    org.id,
                          parentArea:     null,
                          levelName:      a.type,
                          childLevel:     (org.cascade_level || 1) + 1,
                          plan:           org.plan,
                          primaryColor:   org.primary_color,
                          trialEndsAt:    new Date(Date.now() + 90*86400000).toISOString(),
                          fromOnboarding: true,
                          userId:         session.user.id,
                        }),
                      });
                    }
                    setSaving(false);
                    setStep(3);
                  }} disabled={saving} className="btn-primary flex-1 py-3">
                    {saving ? "Creating areas..." : "Continue →"}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3 — Sprint ── */}
            {step === 3 && (
              <div className="fade-up">
                <div className="mb-8">
                  <div className="font-bold text-2xl tracking-tight mb-1" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    Create your first sprint
                  </div>
                  <div className="t-mono">Strategic cycles to test your bets. Set the direction.</div>
                </div>

                <div className="mb-4">
                  <div className="t-label mb-2">Sprint Name</div>
                  <input className="input" value={sprint.name}
                    onChange={e => setSprint(s => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Q2 FY27 Sprint" />
                </div>

                {/* Duration presets */}
                <div className="mb-4">
                  <div className="t-label mb-2">Duration</div>
                  <div className="flex gap-2 mb-3">
                    {[
                      { label: "30 days", days: 30 },
                      { label: "60 days", days: 60 },
                      { label: "90 days", days: 90 },
                      { label: "Custom",  days: 0 },
                    ].map(p => {
                      const startD = new Date(sprint.start_date);
                      const endD = new Date(sprint.end_date);
                      const diff = Math.round((endD.getTime() - startD.getTime()) / 86400000);
                      const isActive = p.days === 0
                        ? diff !== 30 && diff !== 60 && diff !== 90
                        : diff === p.days;
                      return (
                        <button key={p.label} type="button"
                          onClick={() => {
                            if (p.days === 0) return;
                            const end = new Date(sprint.start_date);
                            end.setDate(end.getDate() + p.days);
                            setSprint(s => ({ ...s, end_date: end.toISOString().split("T")[0] }));
                          }}
                          className="flex-1 py-2 rounded text-sm transition-colors"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.75rem",
                            fontWeight: isActive ? 600 : 400,
                            border: `1.5px solid ${isActive ? "var(--brand)" : "var(--border-mid)"}`,
                            background: isActive ? "var(--brand-bg)" : "var(--surface)",
                            color: isActive ? "var(--brand)" : "var(--t2)",
                            cursor: p.days === 0 ? "default" : "pointer",
                          }}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="t-label mb-2">Start Date</div>
                    <input className="input" type="date" value={sprint.start_date}
                      onChange={e => {
                        const start = e.target.value;
                        const startD = new Date(start);
                        const endD = new Date(sprint.end_date);
                        const diff = Math.round((endD.getTime() - new Date(sprint.start_date).getTime()) / 86400000);
                        const newEnd = new Date(startD);
                        newEnd.setDate(newEnd.getDate() + (diff > 0 ? diff : 90));
                        setSprint(s => ({ ...s, start_date: start, end_date: newEnd.toISOString().split("T")[0] }));
                      }} />
                  </div>
                  <div>
                    <div className="t-label mb-2">End Date</div>
                    <input className="input" type="date" value={sprint.end_date}
                      onChange={e => setSprint(s => ({ ...s, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="t-label mb-2">Strategic Focus</div>
                  <textarea className="input" rows={3} value={sprint.focus}
                    onChange={e => setSprint(s => ({ ...s, focus: e.target.value }))}
                    placeholder="What are the 2-3 most important things this sprint?" />
                </div>
                <div className="mb-8">
                  <div className="t-label mb-2">Success Signals <span className="t-mono text-xs ml-1">separate with, </span></div>
                  <textarea className="input" rows={2} value={sprint.signals}
                    onChange={e => setSprint(s => ({ ...s, signals: e.target.value }))}
                    placeholder="e.g. Revenue pipeline growing, Key hire closed, Product shipped" />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
                  <button onClick={saveSprint} disabled={saving} className="btn-primary flex-1 py-3">
                    {saving ? "Creating..." : "Create Sprint →"}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4 — Bets ── */}
            {step === 4 && (
              <div className="fade-up">
                <div className="mb-8">
                  <div className="font-bold text-2xl tracking-tight mb-1" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    Add your first bets
                  </div>
                  <div className="t-mono">Strategic bets are testable hypotheses. You can add more later.</div>
                </div>

                <div className="space-y-4 mb-4">
                  {bets.map((b, i) => (
                    <div key={b.id} className="rounded p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="t-label" style={{ color: bc }}>Bet {i + 1}</div>
                        {bets.length > 1 && (
                          <button type="button" onClick={() => removeBet(b.id)}
                            className="t-mono text-xs" style={{ color: "var(--t2)", background: "none", border: "none", cursor: "pointer" }}>
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="t-label mb-1">Bet Name</div>
                          <input className="input" value={b.name} onChange={e => updateBet(b.id, "name", e.target.value)}
                            placeholder="e.g. AI-Assisted Delivery Pods" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="t-label mb-1">Owner Area</div>
                            <select className="input" value={b.owner_area} onChange={e => updateBet(b.id, "owner_area", e.target.value)}>
                              <option value="">— Select —</option>
                              {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <div className="t-label mb-1">Outcome</div>
                            <input className="input" value={b.outcome} onChange={e => updateBet(b.id, "outcome", e.target.value)}
                              placeholder="Measurable in 90 days" />
                          </div>
                        </div>
                        <div>
                          <div className="t-label mb-1">Hypothesis</div>
                          <textarea className="input" rows={2} value={b.hypothesis}
                            onChange={e => updateBet(b.id, "hypothesis", e.target.value)}
                            placeholder="If we do X, we believe Y will happen..." />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addBetRow}
                  className="w-full py-2.5 mb-8 rounded text-sm transition-colors"
                  style={{ border: "1px dashed var(--border-mid)", background: "transparent", color: "var(--t2)", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                  + Add another bet
                </button>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(3)} className="btn-ghost flex-1">Back</button>
                  <button onClick={finalize} disabled={saving} className="btn-primary flex-1 py-3">
                    {saving ? "Finishing..." : "Launch Dashboard →"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
