"use client";
import { useT } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal, { Field, FieldRow, ModalFooter } from "@/components/ui/Modal";

// Recommended sprint durations by level
const LEVEL_CONFIG: Record<number, { default: number; min: number; max: number; label: string }> = {
  1: { default: 90, min: 60, max: 90,  label: "60–90 days" },
  2: { default: 30, min: 30, max: 60,  label: "30–60 days" },
  3: { default: 15, min: 15, max: 30,  label: "15–30 days" },
  4: { default: 7,  min: 7,  max: 15,  label: "7–15 days"  },
};

function getLevelConfig(level: number) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG[4];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

function Helper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="font-semibold text-sm mb-1.5" style={{ color: "var(--text)" }}>{title}</div>
      <div style={{ fontSize: "0.875rem", color: "var(--t2)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function NewSprintPage() {
  const t = useT("form");
  const router = useRouter();
  const params = useParams();
  const { org, addSprint } = useStore();
  const level = org?.cascade_level || 1;
  const config = getLevelConfig(level);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    name: "",
    start_date: today,
    end_date: addDays(today, config.default),
    focus: "",
    signals: "",
    status: "Planned",
  });
  const [saving, setSaving] = useState(false);
  const [parentSprint, setParentSprint] = useState<{
    name: string; start_date: string; end_date: string;
  } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Load parent sprint for context
  useEffect(() => {
    if (!org?.parent_org_id) return;
    supabase.from("sprints").select("name, start_date, end_date")
      .eq("org_id", org.parent_org_id).eq("status", "Active")
      .maybeSingle()
      .then(({ data }) => setParentSprint(data));
  }, [org?.parent_org_id]);

  // Auto-update end_date when start_date changes
  function handleStartDate(e: React.ChangeEvent<HTMLInputElement>) {
    const start = e.target.value;
    setForm(f => ({ ...f, start_date: start, end_date: addDays(start, config.default) }));
  }

  // Compute warnings
  const duration = form.start_date && form.end_date ? daysBetween(form.start_date, form.end_date) : 0;
  const warnings: string[] = [];

  if (duration > 0) {
    if (duration < config.min) {
      warnings.push(`Sprint is shorter than recommended (${config.min} days min for L${level}).`);
    }
    if (duration > config.max) {
      warnings.push(`Sprint is longer than recommended (${config.max} days max for L${level}).`);
    }
  }

  if (parentSprint && form.start_date && form.end_date) {
    if (form.end_date > parentSprint.end_date) {
      warnings.push(`Sprint ends after parent sprint "${parentSprint.name}" (${parentSprint.end_date}).`);
    }
    if (duration > daysBetween(parentSprint.start_date, parentSprint.end_date)) {
      warnings.push(`Sprint is longer than the parent sprint.`);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    const { data } = await supabase.from("sprints")
      .insert({ ...form, org_id: org.id }).select().single();
    if (data) { addSprint(data); router.push(`/${params.orgSlug}/sprints`); }
    setSaving(false);
  }

  const SIDEBAR = (
    <div>
      <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700,
        letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--brand)", marginBottom:6 }}>
        {t("sidebar.sprintTitle")}
      </div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.25rem",
        color:"var(--text)", letterSpacing:"-0.02em", marginBottom:8 }}>
        {t("sidebar.sprintHeading")}
      </div>
      <p style={{ fontSize:"0.875rem", color:"var(--t2)", lineHeight:1.6, marginBottom:20 }}>
        {t("sidebar.sprintDesc")}
      </p>

      {/* Recommended duration for this level */}
      <div style={{ padding:"10px 14px", borderRadius:"var(--rs)", marginBottom:16,
        background:"var(--brand-bg)", border:"1px solid var(--brand-mid)" }}>
        <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700,
          letterSpacing:"0.05em", textTransform:"uppercase", color:"var(--brand)", marginBottom:4 }}>
          L{level} Recommended Duration
        </div>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.5rem",
          color:"var(--brand)", letterSpacing:"-0.02em" }}>
          {config.label}
        </div>
        <div style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--t2)", marginTop:4 }}>
          Default: {config.default} days
        </div>
      </div>

      {/* Parent sprint context */}
      {parentSprint && (
        <div style={{ padding:"10px 14px", borderRadius:"var(--rs)", marginBottom:16,
          background:"var(--raised)", border:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700,
            letterSpacing:"0.05em", textTransform:"uppercase", color:"var(--t3)", marginBottom:6 }}>
            Parent Sprint
          </div>
          <div style={{ fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.875rem",
            color:"var(--text)", marginBottom:4 }}>
            {parentSprint.name}
          </div>
          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.75rem", color:"var(--t3)" }}>
            {parentSprint.start_date} → {parentSprint.end_date}
          </div>
          <button type="button"
            onClick={() => setForm(f => ({
              ...f,
              start_date: parentSprint.start_date,
              end_date: addDays(parentSprint.start_date, config.default),
            }))}
            style={{ marginTop:8, background:"none", border:"none", cursor:"pointer",
              fontFamily:"var(--font-body)", fontSize:"0.8125rem",
              color:"var(--brand)", fontWeight:600, padding:0 }}>
            Align to parent dates →
          </button>
        </div>
      )}

      <Helper title={t("strategicFocus")}>
        {t("sidebar.focusRuleDesc")}
      </Helper>
      <Helper title={t("successSignals")}>
        {t("sidebar.signalsRuleDesc")}
      </Helper>
      <Helper title={t("rules")}>
        <ul style={{ paddingLeft:14, marginTop:4 }}>
          <li style={{ marginBottom:4 }}>{t("sidebar.rule1")}</li>
          <li style={{ marginBottom:4 }}>{t("sidebar.rule2")}</li>
          <li>{t("sidebar.rule3")}</li>
        </ul>
      </Helper>
    </div>
  );

  return (
    <Modal title={t("newSprint")} subtitle={`L${level} · Recommended ${config.label}`} sidebar={SIDEBAR}>
      <form onSubmit={save}>
        <Field label={t("sprintName")} hint={t("sprintNameHint")}>
          <input className="input" value={form.name} onChange={set("name")}
            placeholder={t("sprintNamePlaceholder")} required autoFocus />
        </Field>

        <FieldRow>
          <Field label={t("startDate")}>
            <input className="input" type="date" value={form.start_date}
              onChange={handleStartDate} required />
          </Field>
          <Field label={t("endDate")}>
            <input className="input" type="date" value={form.end_date}
              onChange={set("end_date")} required />
          </Field>
        </FieldRow>

        {/* Duration display */}
        {duration > 0 && (
          <div style={{ marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem",
              color:"var(--t3)" }}>Duration:</span>
            <span style={{ fontFamily:"var(--font-display)", fontWeight:700,
              fontSize:"1rem", color:"var(--text)" }}>{duration} days</span>
            {/* Quick preset buttons */}
            <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
              {[config.min, config.default, config.max].filter((v,i,a) => a.indexOf(v) === i).map(d => (
                <button key={d} type="button"
                  onClick={() => setForm(f => ({ ...f, end_date: addDays(f.start_date, d) }))}
                  style={{
                    padding:"2px 8px", borderRadius:"var(--rs)", border:"1px solid var(--border-mid)",
                    background: duration === d ? "var(--brand)" : "var(--raised)",
                    color: duration === d ? "#fff" : "var(--t2)",
                    fontFamily:"var(--font-body)", fontSize:"0.75rem", cursor:"pointer",
                  }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.map((w, i) => (
          <div key={i} style={{ padding:"8px 12px", borderRadius:"var(--rs)", marginBottom:8,
            background:"rgba(234,160,18,0.06)", border:"1px solid rgba(234,160,18,0.2)",
            fontFamily:"var(--font-body)", fontSize:"0.8125rem", color:"var(--unclear)",
            display:"flex", alignItems:"flex-start", gap:8 }}>
            <span style={{ flexShrink:0, fontWeight:700 }}>!</span>
            {w}
          </div>
        ))}

        <Field label={t("strategicFocus")} hint={t("focusHint")}>
          <textarea className="input" rows={3} value={form.focus} onChange={set("focus")}
            placeholder={t("focusPlaceholder")} required />
        </Field>
        <Field label={t("successSignals")} hint={t("signalsHint")}>
          <textarea className="input" rows={2} value={form.signals} onChange={set("signals")}
            placeholder={t("signalsPlaceholder")} />
        </Field>
        <Field label={t("status")}>
          <select className="input" value={form.status} onChange={set("status")}>
            <option>Planned</option><option>Active</option>
          </select>
        </Field>

        <ModalFooter>
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? t("creating") : t("createSprint")}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
