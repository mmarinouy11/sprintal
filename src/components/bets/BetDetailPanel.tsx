"use client";
import { useT } from "@/lib/i18n";
import { useSyntacticCoach } from "@/lib/coach/useSyntacticCoach";
import CoachObservation from "@/components/coach/CoachObservation";
import React, { useEffect, useState, useCallback } from "react";
import { Bet, Evidence, SignalCheck } from "@/types";
import { StatusBadge, SignalBadge, AreaTag } from "@/components/ui/Badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";


interface Props {
  bet: Bet;
  evidence: Evidence[];
  signalChecks: SignalCheck[];
  sprintName: string;
  onClose: () => void;
}

function Section({ label, color, children }: { label: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="font-medium text-xs tracking-wide pb-2 mb-3"
        style={{
          color: color || "var(--brand)",
          borderBottom: `1px solid ${color ? `${color}25` : "var(--brand-bg)"}`,
          fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
        }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, color }: { label: string; value?: string; color?: string }) {
  const t = useT("betDetail");
  const empty = !value;
  return (
    <div className="mb-3">
      <div className="t-label mb-1">{label}</div>
      <div className="text-sm leading-relaxed"
        style={{ color: empty ? "var(--t3)" : (color || "var(--text)"), fontStyle: empty ? "italic" : "normal" }}>
        {value || t("notDefined")}
      </div>
    </div>
  );
}

function ImpactPill({ label, value }: { label: string; value?: string }) {
  const t = useT("betDetail");
  const colors: Record<string,string> = { High:"var(--scaled)", Medium:"var(--unclear)", Low:"var(--t3)" };
  return (
    <div className="rounded p-3 text-center"
      style={{ background:"var(--raised)", border:"1px solid var(--border)" }}>
      <div className="t-label mb-1">{label}</div>
      <div className="font-semibold text-sm" style={{ color: colors[value||""] || "var(--t3)", fontFamily:"var(--font-display)" }}>
        {value ? t(value.toLowerCase() as string) : "—"}
      </div>
    </div>
  );
}

function getBetCompleteness(bet: Bet, t: (k:string)=>string) {
  const fields = [
    { label:t("hypothesis"),       done: !!bet.hypothesis },
    { label:t("killCriteria"),     done: !!bet.kill_criteria },
    { label:t("scaleTrigger"),     done: !!bet.scale_trigger },
    { label:t("strategicOutcome"), done: !!bet.outcome },
    { label:t("whyNow"),           done: !!bet.why_now },
    { label:t("leadingIndicators"),done: (bet.indicators?.length||0) > 0 },
  ];
  const done = fields.filter(f=>f.done).length;
  return { fields, done, total: fields.length, pct: Math.round((done/fields.length)*100) };
}

const EV_BORDER: Record<string,string> = {
  Active:"var(--active)", Scaled:"var(--scaled)", Pivoted:"var(--pivoted)", Done:"var(--done)", Killed:"var(--killed)",
};

// ── Edit form ─────────────────────────────────────────────────────────────
function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="t-label">{label}</div>
        {hint && <div className="t-mono text-xs" style={{color:"var(--t3)"}}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

const EditForm = React.memo(function EditForm({ bet, onSave, onCancel }: { bet: Bet; onSave: (b: Bet) => void; onCancel: () => void }) {
  const t = useT("betDetail");
  const tg = useT();
  const { childOrgs } = useStore();
  const areas = childOrgs.map(a => a.name);
  const [form, setForm] = useState({
    name:          bet.name || "",
    outcome:       bet.outcome || "",
    why_now:       bet.why_now || "",
    hypothesis:    bet.hypothesis || "",
    kill_criteria: bet.kill_criteria || "",
    scale_trigger: bet.scale_trigger || "",
    owner_area:    bet.owner_area || "",
    owner_contact: bet.owner_contact || "",
    indicators:    (bet.indicators||[]).join(", "),
    revenue:       bet.revenue || "Medium",
    margin:        bet.margin || "Medium",
    importance:    bet.importance || "Medium",
  });
  const [saving, setSaving] = useState(false);
  const coach = useSyntacticCoach();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    const indicators = form.indicators.split(",").map(s=>s.trim()).filter(Boolean).slice(0,3);
    const updates = { ...form, indicators };
    const { data } = await supabase.from("bets").update(updates).eq("id", bet.id).select().single();
    if (data) onSave({ ...bet, ...updates });
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-2 rounded text-sm outline-none transition-all";
  const inputStyle = { background:"var(--raised)", border:"1px solid var(--border-mid)", color:"var(--text)", fontFamily:"var(--font-body)", borderRadius:"var(--rs)" };
  const focusStyle = "focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-bg)]";

  return (
    <div>
      <F label={t("betName")}>
        <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.name} onChange={set("name")} />
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label={t("ownerArea")}>
          <select className={`${inputCls} ${focusStyle}`} style={{...inputStyle, appearance:"none", cursor:"pointer"}}
            value={form.owner_area} onChange={set("owner_area")}>
            <option value="">— Select —</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
        <F label={t("pointOfContact")}>
          <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.owner_contact} onChange={set("owner_contact")} placeholder={t("ownerContactPlaceholder")} />
        </F>
      </div>
      <F label={t("strategicOutcome")}>
        <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.outcome} onChange={set("outcome")} onBlur={e => coach.check("outcome", e.target.value)} placeholder={t("outcomePlaceholder")} />
        <CoachObservation observation={coach.results["outcome"]?.observation || null} loading={coach.results["outcome"]?.loading || false} />
      </F>
      <F label={t("whyNow")}>
        <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.why_now} onChange={set("why_now")} onBlur={e => coach.check("why_now", e.target.value)} placeholder={t("whyNowPlaceholder")} />
        <CoachObservation observation={coach.results["why_now"]?.observation || null} loading={coach.results["why_now"]?.loading || false} />
      </F>
      <F label={t("hypothesis")} hint={t("hypothesisHint")}>
        <textarea className={`${inputCls} ${focusStyle}`} style={{...inputStyle, resize:"none"}} rows={3}
          onBlur={e => coach.check("hypothesis", e.target.value)}
          value={form.hypothesis} onChange={set("hypothesis")} placeholder={t("hypothesisPlaceholder")} />
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label={t("killCriteria")}>
          <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.kill_criteria} onChange={set("kill_criteria")} onBlur={e => coach.check("kill_criteria", e.target.value)} placeholder={t("killPlaceholder")} />
          <CoachObservation observation={coach.results["kill_criteria"]?.observation || null} loading={coach.results["kill_criteria"]?.loading || false} />
        </F>
        <F label={t("scaleTrigger")}>
          <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.scale_trigger} onChange={set("scale_trigger")} onBlur={e => coach.check("scale_trigger", e.target.value)} placeholder={t("scalePlaceholder")} />
          <CoachObservation observation={coach.results["scale_trigger"]?.observation || null} loading={coach.results["scale_trigger"]?.loading || false} />
        </F>
      </div>
      <F label={t("leadingIndicators")} hint={t("indicatorsHint")}>
        <input className={`${inputCls} ${focusStyle}`} style={inputStyle} value={form.indicators} onChange={set("indicators")} onBlur={e => coach.check("indicators", e.target.value)} placeholder={t("indicatorsPlaceholder")} />
        <CoachObservation observation={coach.results["indicators"]?.observation || null} loading={coach.results["indicators"]?.loading || false} />
      </F>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[[t("revenue"),"revenue"],[t("margin"),"margin"],[t("importanceLabel"),"importance"]].map(([label,key]) => (
          <F key={key} label={label}>
            <select className={`${inputCls} ${focusStyle}`} style={{...inputStyle, appearance:"none", cursor:"pointer"}}
              value={form[key as keyof typeof form]} onChange={set(key)}>
              <option value="High">{t("high")}</option><option value="Medium">{t("medium")}</option><option value="Low">{t("low")}</option>
            </select>
          </F>
        ))}
      </div>
      <div className="flex gap-2 pt-3" style={{ borderTop:"1px solid var(--border)" }}>
        <button onClick={onCancel} className="btn-ghost flex-1" disabled={saving}>Cancel</button>
        <button onClick={save} className="btn-primary flex-1" disabled={saving}>
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
});

// ── Main panel ────────────────────────────────────────────────────────────
function BetDetailPanel({ bet: initialBet, evidence, signalChecks, sprintName, onClose }: Props) {
  const { updateBet, betAlignments, bets: allBets, childOrgs } = useStore();
  const areas = childOrgs.map(a => a.name);
  const [bet, setBet] = useState(initialBet);
  const t = useT("betDetail");
  const tg = useT();
  const [editing, setEditing] = useState(false);

  // Cascade relationships
  const parentAlignments = betAlignments.filter(a => a.child_bet_id === bet.id);
  const childAlignments  = betAlignments.filter(a => a.parent_bet_id === bet.id);
  const [externalParentBets, setExternalParentBets] = useState<Bet[]>([]);
  const [externalChildBets, setExternalChildBets] = useState<Bet[]>([]);

  // Load cross-org bets from alignments (parent/child bets may be in different orgs)
  useEffect(() => {
    const parentIds = parentAlignments.map(a => a.parent_bet_id);
    const childIds  = childAlignments.map(a => a.child_bet_id);

    // First try local store
    const localParents = parentIds.map(id => allBets.find(b => b.id === id)).filter(Boolean) as Bet[];
    const localChildren = childIds.map(id => allBets.find(b => b.id === id)).filter(Boolean) as Bet[];
    setExternalParentBets(localParents);
    setExternalChildBets(localChildren);

    // Fetch any missing from DB (cross-org)
    const missingParentIds = parentIds.filter(id => !allBets.find(b => b.id === id));
    const missingChildIds  = childIds.filter(id => !allBets.find(b => b.id === id));

    if (missingParentIds.length > 0) {
      supabase.from("bets").select("*").in("id", missingParentIds)
        .then(({ data }) => {
          if (data?.length) setExternalParentBets(prev => [...prev, ...data]);
        });
    }
    if (missingChildIds.length > 0) {
      supabase.from("bets").select("*").in("id", missingChildIds)
        .then(({ data }) => {
          if (data?.length) setExternalChildBets(prev => [...prev, ...data]);
        });
    }
  }, [bet.id, betAlignments.length]);

  const parentBets = externalParentBets;
  const childBets  = externalChildBets;

  const betEvidence = evidence.filter(e=>e.bet_id===bet.id)
    .sort((a,z)=>new Date(z.created_at||z.date).getTime()-new Date(a.created_at||a.date).getTime());
  const betSignals = signalChecks.filter(s=>s.bet_id===bet.id)
    .sort((a,z)=>new Date(z.created_at||z.date).getTime()-new Date(a.created_at||a.date).getTime());
  const completeness = getBetCompleteness(bet, t);
  const isIncomplete = completeness.pct < 100;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key==="Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = useCallback((updated: Bet) => {
    setBet(updated);
    updateBet(updated);
    setEditing(false);
  }, [updateBet]);

  const handleCancel = useCallback(() => setEditing(false), []);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{background:"rgba(10,10,8,0.4)"}} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width:520, maxWidth:"92vw",
          background:"var(--bg)",
          borderLeft:"1px solid var(--border-mid)",
          boxShadow:"-12px 0 40px rgba(0,0,0,0.12)",
          animation:"slideInRight 0.2s ease",
        }}>

        {/* Header */}
        <div className="px-6 py-4 flex-shrink-0"
          style={{background:"var(--sidebar)", borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="font-bold text-lg tracking-tight leading-tight"
              style={{color:"var(--text)", letterSpacing:"-0.02em"}}>
              {bet.name}
              {bet.is_draft && <span className="ml-2 badge badge-pivoted" style={{fontSize:"0.6rem", verticalAlign:"middle"}}>DRAFT</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => setEditing(!editing)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  fontFamily:"var(--font-mono)",
                  background: editing ? "var(--brand)" : "var(--raised)",
                  color: editing ? "#fff" : "var(--t2)",
                  border:"1px solid var(--border-mid)",
                  cursor:"pointer",
                }}>
                {editing ? t("viewMode") : t("edit")}
              </button>
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                style={{background:"none", border:"1px solid var(--border-mid)", color:"var(--t3)", cursor:"pointer", fontSize:"1.1rem"}}>
                ×
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={bet.status} />
            <SignalBadge signal={bet.signal} />
            <AreaTag area={bet.owner_area} />
            {bet.owner_contact && <span className="t-mono" style={{color:"var(--t3)"}}>{bet.owner_contact}</span>}
          </div>
          {bet.last_note && !editing && (
            <div className="mt-2 text-sm italic" style={{color:"var(--t3)"}}>{bet.last_note}</div>
          )}
        </div>

        {/* Incomplete warning */}
        {isIncomplete && !editing && (
          <div className="px-6 py-2.5 flex items-center gap-3 flex-shrink-0"
            style={{background:"rgba(234,160,18,0.06)", borderBottom:"1px solid rgba(234,160,18,0.12)"}}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{background:"var(--unclear)", color:"#fff", fontSize:"0.6rem", fontWeight:700}}>!</div>
            <div className="flex-1">
              <div className="t-mono font-medium" style={{color:"var(--unclear)"}}>
                {t("fieldsIncomplete", { done: String(completeness.done), total: String(completeness.total), fields: completeness.fields.filter(f=>!f.done).map(f=>f.label).join(", ") })}
              </div>
            </div>
            <button onClick={()=>setEditing(true)}
              className="t-mono text-xs underline underline-offset-2"
              style={{color:"var(--unclear)", background:"none", border:"none", cursor:"pointer"}}>
              {t("completeBtn")}
            </button>
          </div>
        )}

        {/* Parent alert banner */}
        {bet.parent_alert && bet.parent_alert_status && (
          <div className="px-6 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background:"rgba(220,38,38,0.06)", borderBottom:"1px solid rgba(220,38,38,0.12)" }}>
            <div style={{ width:16, height:16, borderRadius:"50%", background:"var(--killed)",
              color:"#fff", fontSize:"0.6rem", fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>!</div>
            <div>
              <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.8125rem", color:"var(--killed)" }}>
                Parent bet was {bet.parent_alert_status}
              </div>
              <div style={{ fontFamily:"var(--font-body)", fontSize:"0.75rem", color:"var(--t3)", marginTop:1 }}>
                Review whether this bet is still relevant.
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {editing ? (
            <EditForm bet={bet} onSave={handleSave} onCancel={handleCancel} />
          ) : (
            <>
              <Section label={t("context")}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Field label={t("sprint")} value={sprintName} />
                  <Field label={t("pointOfContact")} value={bet.owner_contact} />
                </div>
                {(bet.alignment?.length||0)>0 && (
                  <div>
                    <div className="t-label mb-1.5">Support & Alignment</div>
                    <div className="flex gap-1 flex-wrap">{bet.alignment.map(a=><AreaTag key={a} area={a}/>)}</div>
                  </div>
                )}
              </Section>

              <Section label={t("strategicDefinition")}>
                <Field label={t("strategicOutcome")} value={bet.outcome} />
                <Field label={t("hypothesis")} value={bet.hypothesis} />
                <Field label={t("whyNow")} value={bet.why_now} />
              </Section>

              <Section label={t("evidenceSignal")}>
                <div className="t-label mb-2">{t("leadingIndicators")}</div>
                {(bet.indicators?.length||0)>0
                  ? <div className="flex flex-wrap gap-1.5">
                      {bet.indicators.map((ind,i)=>(
                        <span key={i} className="badge badge-planned" style={{fontSize:"0.75rem", padding:"4px 10px"}}>{ind}</span>
                      ))}
                    </div>
                  : <span className="text-sm italic" style={{color:"var(--t3)"}}>Not defined</span>
                }
              </Section>

              <Section label={t("decisionCriteria")}>
                <Field label={t("killCriteria")} value={bet.kill_criteria} color="var(--killed)" />
                <Field label={t("scaleTrigger")} value={bet.scale_trigger} color="var(--scaled)" />
              </Section>

              <Section label={t("businessImpact")}>
                <div className="grid grid-cols-3 gap-2">
                  <ImpactPill label={t("revenue")} value={bet.revenue} />
                  <ImpactPill label={t("margin")} value={bet.margin} />
                  <ImpactPill label={t("strategicImportance")} value={bet.importance} />
                </div>
              </Section>

              {/* Cascade section */}
              {(parentBets.length > 0 || childBets.length > 0 || (!bet.parent_alert && bet.bet_type === "strategic" && parentBets.length === 0)) && (
                <Section label={t("cascade")}>
                  {/* Enabler badge */}
                  {bet.bet_type === "enabler" && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px",
                      borderRadius:"var(--rs)", background:"var(--brand-bg)", border:"1px solid var(--brand-mid)",
                      marginBottom:12 }}>
                      <span style={{ fontSize:"0.875rem" }}>⚙</span>
                      <span style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--brand)", fontWeight:500 }}>
                        {t("enablerBet")}
                      </span>
                    </div>
                  )}
                  {/* Parent bets */}
                  {parentBets.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div className="t-label mb-2" style={{ color:"var(--t3)" }}>Responds to</div>
                      {parentBets.map(pb => pb && (
                        <div key={pb.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
                          borderRadius:"var(--rs)", background:"var(--raised)", border:"1px solid var(--border)",
                          marginBottom:6 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--brand)", flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:500, fontSize:"0.875rem", color:"var(--text)",
                              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pb.name}</div>
                            <div style={{ fontSize:"0.75rem", color:"var(--t3)" }}>{pb.owner_area}</div>
                          </div>
                          <div className="badge" style={{ background:`color-mix(in srgb, var(--${pb.status.toLowerCase()}) 10%, transparent)`,
                            color:`var(--${pb.status.toLowerCase()})`,
                            border:`1px solid color-mix(in srgb, var(--${pb.status.toLowerCase()}) 25%, transparent)` }}>
                            {pb.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Orphan warning */}
                  {bet.bet_type === "strategic" && parentBets.length === 0 && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                      borderRadius:"var(--rs)", background:"rgba(234,160,18,0.06)",
                      border:"1px solid rgba(234,160,18,0.2)", marginBottom:12 }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", background:"var(--unclear)",
                        color:"#fff", fontSize:"0.6rem", fontWeight:700,
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>!</div>
                      <div style={{ fontSize:"0.8125rem", color:"var(--unclear)" }}>
                        {t("orphanWarning")}
                      </div>
                    </div>
                  )}
                  {/* Child bets */}
                  {childBets.length > 0 && (
                    <div>
                      <div className="t-label mb-2" style={{ color:"var(--t3)" }}>{t("supportingBets", { count: String(childBets.length) })}</div>
                      {childBets.map(cb => cb && (
                        <div key={cb.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
                          borderRadius:"var(--rs)", background:"var(--raised)", border:"1px solid var(--border)",
                          marginBottom:6 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--scaled)", flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:500, fontSize:"0.875rem", color:"var(--text)",
                              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cb.name}</div>
                            <div style={{ fontSize:"0.75rem", color:"var(--t3)" }}>{cb.owner_area}</div>
                          </div>
                          <div className="badge" style={{ background:`color-mix(in srgb, var(--${cb.signal.toLowerCase()}) 10%, transparent)`,
                            color:`var(--${cb.signal.toLowerCase()})`,
                            border:`1px solid color-mix(in srgb, var(--${cb.signal.toLowerCase()}) 25%, transparent)` }}>
                            ● {cb.signal}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {betEvidence.length>0 && (
                <Section label={t("evidenceLog", { count: String(betEvidence.length) })}>
                  <div className="space-y-2">
                    {betEvidence.map(e=>(
                      <div key={e.id} className="rounded p-3"
                        style={{background:"var(--surface)", border:"1px solid var(--border)", borderLeft:`2px solid ${EV_BORDER[e.new_status||"Active"]||"var(--border-mid)"}`}}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="t-mono" style={{color:"var(--t3)"}}>{e.date}</span>
                          {e.new_status && <StatusBadge status={e.new_status}/>}
                        </div>
                        {e.actual && <div className="text-sm mb-1" style={{color:"var(--text)"}}>{e.actual}</div>}
                        <div className="text-sm" style={{color:"var(--t2)"}}>{e.insight}</div>
                        {e.action && <div className="t-mono mt-2 font-medium" style={{color:"var(--brand)"}}>→ {e.action}</div>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {betSignals.length>0 && (
                <Section label={`Signal Checks (${betSignals.length})`}>
                  <div className="space-y-2">
                    {betSignals.map(sc=>(
                      <div key={sc.id} className="rounded p-3"
                        style={{background:"var(--surface)", border:"1px solid var(--border)", borderLeft:"3px solid var(--active)"}}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="t-mono" style={{color:"var(--t3)"}}>{sc.date}</span>
                          <SignalBadge signal={sc.signal}/>
                          {sc.prev_signal!==sc.signal && (
                            <span className="t-mono text-xs" style={{color:"var(--t3)"}}>← was {sc.prev_signal}</span>
                          )}
                        </div>
                        {sc.note && <div className="text-sm" style={{color:"var(--t2)"}}>{sc.note}</div>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  );
}

export default BetDetailPanel;
