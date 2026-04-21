"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal, { Field, FieldRow, ModalFooter } from "@/components/ui/Modal";
import type { Bet } from "@/types";

function Helper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div style={{ fontWeight:600, fontSize:"0.875rem", color:"var(--text)", marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:"0.875rem", color:"var(--t2)", lineHeight:1.6 }}>{children}</div>
    </div>
  );
}
function Example({ text }: { text: string }) {
  return <div style={{ marginTop:6, padding:"6px 10px", borderRadius:"var(--rs)", background:"var(--raised)", borderLeft:"2px solid var(--brand-bg)", fontSize:"0.8125rem", color:"var(--t3)", fontStyle:"italic" }}>e.g. {text}</div>;
}
function Rule({ children }: { children: React.ReactNode }) {
  return <div style={{ display:"flex", gap:8, fontSize:"0.875rem", color:"var(--t2)", marginBottom:6 }}><span style={{ color:"var(--brand)", flexShrink:0 }}>·</span>{children}</div>;
}

const SIDEBAR = (
  <div>
    <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--brand)", marginBottom:6 }}>Bet Creation</div>
    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.25rem", color:"var(--text)", letterSpacing:"-0.02em", marginBottom:8 }}>Create a Bet</div>
    <p style={{ fontSize:"0.875rem", color:"var(--t2)", lineHeight:1.6, marginBottom:20 }}>
      A Bet is a testable hypothesis — not a project. If it cannot produce evidence within the sprint, it is not a bet.
    </p>
    <Helper title="Hypothesis Format">
      Use: "If we do X, we believe Y will happen, measured by Z."
      <Example text="If we embed AI copilots in 3 squads, we believe cycle time will drop 20%, measured by sprint velocity." />
    </Helper>
    <Helper title="Kill Criteria">
      Define upfront when you will stop. This removes politics from the decision later.
      <Example text="AI usage rate below 30% after 6 weeks." />
    </Helper>
    <Helper title="Scale Trigger">
      Define the signal that confirms you should double down.
      <Example text="Cycle time reduction ≥20% across all 3 squads." />
    </Helper>
    <Helper title="Enabler Bets">
      Mark a bet as Enabler when it builds capability rather than testing a market hypothesis. Tech debt, infrastructure, talent — these don't need a parent bet.
    </Helper>
    <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
      <div style={{ fontWeight:600, fontSize:"0.875rem", color:"var(--text)", marginBottom:8 }}>Portfolio Rules</div>
      <Rule>3–5 active bets per sprint maximum.</Rule>
      <Rule>Balance across revenue, margin, and capability.</Rule>
      <Rule>Each bet must have a clear owner area.</Rule>
    </div>
  </div>
);

export default function NewBetPage() {
  const router = useRouter();
  const params = useParams();
  const { org, sprints, childOrgs, addBet, addBetAlignment, bets } = useStore();
  const areas = childOrgs.map(a => a.name);
  const [saving, setSaving] = useState(false);
  // Pre-select first area
  const [error, setError] = useState("");
  const [alignment, setAlignment] = useState<string[]>([]);
  const [parentBetIds, setParentBetIds] = useState<string[]>([]);
  const [parentBets, setParentBets] = useState<Bet[]>([]);
  const [isEnabler, setIsEnabler] = useState(false);
  const [form, setForm] = useState({
    sprint_id: sprints.find(s=>s.status==="Active")?.id || sprints[0]?.id || "",
    owner_area: "", owner_contact:"", name:"", outcome:"",
    why_now:"", hypothesis:"", indicators:"", kill_criteria:"", scale_trigger:"",
    revenue:"Medium", margin:"Medium", importance:"Medium",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Load all active bets from parent org
  useEffect(() => {
    if (!org?.parent_org_id) return;
    async function loadParentBets() {
      const { data: parentSprints } = await supabase
        .from("sprints").select("id")
        .eq("org_id", org!.parent_org_id).eq("status", "Active");
      if (!parentSprints?.length) return;
      const { data } = await supabase
        .from("bets").select("id, name, outcome, owner_area, status, signal")
        .eq("org_id", org!.parent_org_id!)
        .eq("status", "Active")
        .in("sprint_id", parentSprints.map((s: { id: string }) => s.id));
      setParentBets((data || []) as Bet[]);
    }
    loadParentBets();
  }, [org?.parent_org_id]);

  function toggleParent(id: string) {
    setParentBetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setError("");
    try {
      // Trial limit — max 5 active bets
      if (org.plan === "trial") {
        const activeBets = bets.filter(b => b.status === "Active");
        if (activeBets.length >= 5) {
          setError("Tu plan trial permite un máximo de 5 bets activos. Activá Pro para continuar.");
          setSaving(false);
          return;
        }
      }
      const indicators = form.indicators.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3);
      const { data: bet } = await supabase.from("bets").insert({
        ...form, org_id: org.id, indicators, alignment,
        signal:"Unclear", is_draft:false, status:"Active",
        bet_type: isEnabler ? "enabler" : "strategic",
        parent_alert: false,
      }).select().single();

      if (!bet) { setError("Error creando el bet."); setSaving(false); return; }
      addBet(bet);

      // Save parent alignments
      for (const parentId of parentBetIds) {
        const { data: aln } = await supabase.from("bet_alignments").insert({
          child_bet_id: bet.id, parent_bet_id: parentId,
        }).select().single();
        if (aln) addBetAlignment(aln);
      }

      router.push(`/${params.orgSlug}/bets/board`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Bet" subtitle="A testable hypothesis — not a project." sidebar={SIDEBAR} wide>
      <form onSubmit={save}>

        {/* Enabler toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"10px 14px", borderRadius:"var(--rs)", marginBottom:16,
          background: isEnabler ? "rgba(92,106,196,0.06)" : "var(--raised)",
          border: `1px solid ${isEnabler ? "var(--brand)" : "var(--border)"}`,
        }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"0.875rem", color:"var(--text)" }}>
              {isEnabler ? "⚙ Enabler Bet" : "Bet"}
            </div>
            <div style={{ fontSize:"0.8125rem", color:"var(--t3)" }}>
              {isEnabler ? "Capability building — no parent required" : "Tests a market or strategic hypothesis"}
            </div>
          </div>
          <button type="button" onClick={() => setIsEnabler(!isEnabler)}
            style={{
              padding:"4px 12px", borderRadius:"var(--rs)", border:"1px solid var(--border-mid)",
              background: isEnabler ? "var(--brand)" : "var(--surface)",
              color: isEnabler ? "#fff" : "var(--t2)",
              fontFamily:"var(--font-body)", fontSize:"0.8125rem", cursor:"pointer",
            }}>
            {isEnabler ? "Strategic →" : "Mark as Enabler"}
          </button>
        </div>

        {/* Parent bets cascade selector */}
        {!isEnabler && parentBets.length > 0 && (
          <Field label="Responds to (parent bets)" hint="optional — select all that apply">
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
              {parentBets.map(b => (
                <button key={b.id} type="button" onClick={() => toggleParent(b.id)}
                  style={{
                    display:"flex", alignItems:"flex-start", gap:10, padding:"8px 12px",
                    borderRadius:"var(--rs)", border:"1.5px solid",
                    borderColor: parentBetIds.includes(b.id) ? "var(--brand)" : "var(--border-mid)",
                    background: parentBetIds.includes(b.id) ? "var(--brand-bg)" : "var(--surface)",
                    cursor:"pointer", textAlign:"left",
                  }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5,
                    background: parentBetIds.includes(b.id) ? "var(--brand)" : "var(--border-mid)" }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:"0.875rem", color:"var(--text)" }}>{b.name}</div>
                    <div style={{ fontSize:"0.8125rem", color:"var(--t3)", marginTop:2 }}>{b.outcome}</div>
                  </div>
                  <div style={{ fontSize:"0.75rem", color:"var(--t3)", flexShrink:0,
                    fontFamily:"var(--font-body)", padding:"1px 6px",
                    background:"var(--raised)", borderRadius:"var(--rs)", border:"1px solid var(--border)" }}>
                    L{(org?.cascade_level || 1) - 1}
                  </div>
                </button>
              ))}
            </div>
            {!isEnabler && org?.parent_org_id && parentBets.length === 0 && (
              <div style={{ fontSize:"0.8125rem", color:"var(--t3)", fontStyle:"italic", marginTop:6 }}>
                No active bets found in the parent level.
              </div>
            )}
          </Field>
        )}

        {/* No parent org — no cascade selector */}
        {!isEnabler && !org?.parent_org_id && (
          <div style={{ padding:"8px 12px", borderRadius:"var(--rs)", marginBottom:16,
            background:"var(--raised)", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:"0.8125rem", color:"var(--t3)" }}>
              This is a <strong>L1 bet</strong> — it can be referenced by lower levels.
            </div>
          </div>
        )}

        <FieldRow>
          <Field label="Sprint">
            <select className="input" value={form.sprint_id} onChange={set("sprint_id")}>
              {sprints.filter(s => s.status !== "Closed").map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Owner Area" hint="from this level">
            <select className="input" value={form.owner_area} onChange={set("owner_area")} required>
              <option value="">— Select —</option>
              {areas.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </FieldRow>

        <Field label="Point of Contact">
          <input className="input" value={form.owner_contact} onChange={set("owner_contact")} placeholder="Name or role" />
        </Field>
        <Field label="Bet Name">
          <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. AI-Assisted Delivery Pods" required />
        </Field>
        <Field label="Strategic Outcome">
          <input className="input" value={form.outcome} onChange={set("outcome")} placeholder="Measurable change in 90 days" required />
        </Field>
        <Field label="Why Now">
          <input className="input" value={form.why_now} onChange={set("why_now")} placeholder="Why is this the right moment?" />
        </Field>

        {!isEnabler && (
          <Field label="Hypothesis" hint="If X → Y → measured by Z">
            <textarea className="input" rows={3} value={form.hypothesis} onChange={set("hypothesis")} required
              placeholder="If we do X, we believe Y will happen, measured by Z" />
          </Field>
        )}

        <FieldRow>
          <Field label="Kill Criteria">
            <input className="input" value={form.kill_criteria} onChange={set("kill_criteria")} placeholder="When do we stop?" />
          </Field>
          <Field label="Scale Trigger">
            <input className="input" value={form.scale_trigger} onChange={set("scale_trigger")} placeholder="When do we double down?" />
          </Field>
        </FieldRow>

        <Field label="Leading Indicators" hint="comma-separated, max 3">
          <textarea className="input" rows={2} value={form.indicators} onChange={set("indicators")}
            placeholder="Metric 1, Metric 2, Metric 3" />
        </Field>

        <Field label="Support & Alignment">
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
            {areas.map(a => (
              <button key={a} type="button"
                onClick={() => setAlignment(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a])}
                style={{
                  padding:"4px 12px", borderRadius:"var(--rs)",
                  fontFamily:"var(--font-body)", fontSize:"0.8125rem", border:"1px solid",
                  borderColor: alignment.includes(a) ? "var(--brand)" : "var(--border-mid)",
                  background: alignment.includes(a) ? "var(--brand-bg)" : "transparent",
                  color: alignment.includes(a) ? "var(--brand)" : "var(--t2)",
                  cursor:"pointer",
                }}>
                {a}
              </button>
            ))}
          </div>
        </Field>

        <FieldRow>
          {[["Revenue","revenue"],["Margin","margin"],["Importance","importance"]].map(([label,key]) => (
            <Field key={key} label={label}>
              <select className="input" value={form[key as keyof typeof form]} onChange={set(key)}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </Field>
          ))}
        </FieldRow>

        {error && (
          <div style={{ padding:"10px 14px", borderRadius:"var(--rs)", marginBottom:8,
            background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", color:"var(--killed)",
            fontSize:"0.875rem" }}>
            {error}
          </div>
        )}

        <ModalFooter>
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Creating..." : "Create Bet →"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
