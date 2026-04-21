"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import Modal, { Field, ModalFooter } from "@/components/ui/Modal";

export default function NewSubOrgPage() {
  const router = useRouter();
  const params = useParams();
  const { org, setChildOrgs, childOrgs, currentRole, rootPlan } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [parentArea, setParentArea] = useState("");
  const [localAreas, setLocalAreas] = useState<{ id: string; name: string; cascade_level: number }[]>([]);

  // Load child orgs as area options
  useEffect(() => {
    if (!org?.id) return;
    supabase.from("organizations").select("id, name, cascade_level")
      .eq("parent_org_id", org.id)
      .then(({ data }) => setLocalAreas(data || []));
  }, [org?.id]);

  // The actual parent is the selected area org, or the current org if no area selected
  const selectedParentOrg = localAreas.find(a => a.name === parentArea);
  const effectiveParentId = selectedParentOrg?.id || org?.id;
  const effectiveParentLevel = selectedParentOrg?.cascade_level || org?.cascade_level || 1;
  const childLevel = effectiveParentLevel + 1;
  const isTrialOrg = rootPlan === "trial";

  const childLevelName = "Area";

  function slugify(s: string) {
    return s.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    if (childLevel > 4) { setError("Máximo 4 niveles de jerarquía."); return; }
    setSaving(true); setError("");
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Sesión expirada. Iniciá sesión de nuevo."); setSaving(false); return; }

      const res = await fetch("/api/org/create-sub", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          parentOrgId:   effectiveParentId,
          parentArea:    parentArea || null,
          levelName:     "area",
          childLevel,
          plan:          org.plan,
          parentOrgPlan: rootPlan,
          primaryColor:  org.primary_color,
          trialEndsAt:   new Date(Date.now() + 90*86400000).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear la unidad.");
        setSaving(false); return;
      }

      setChildOrgs([...childOrgs, data.org]);
      // Stay on parent — sub-org is a sub-unit, not where you operate from
      router.push(`/${params.orgSlug}/dashboard`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setSaving(false);
    }
  }

  const SIDEBAR = (
    <div>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6875rem", fontWeight:700,
        letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--brand)", marginBottom:6 }}>
        Multinivel
      </div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.25rem",
        color:"var(--text)", letterSpacing:"-0.02em", marginBottom:8 }}>
        Nueva área bajo {org?.name}
      </div>
      <p style={{ fontSize:"0.875rem", color:"var(--t2)", lineHeight:1.6, marginBottom:20 }}>
        Cada unidad tiene sus propios sprints y bets, pero sus bets pueden alinearse a objetivos del área superior.
      </p>

      {/* Hierarchy visual */}
      <div style={{ fontWeight:600, fontSize:"0.875rem", color:"var(--text)", marginBottom:10 }}>
        Jerarquía actual
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
        {Array.from({ length: org?.cascade_level || 1 }, (_, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width: i * 14 }} />
            <div style={{ width:6, height:6, borderRadius:"50%",
              background: i === (org?.cascade_level||1)-1 ? "var(--brand)" : "var(--border-mid)" }} />
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem",
              color: i === (org?.cascade_level||1)-1 ? "var(--brand)" : "var(--t3)",
              fontWeight: i === (org?.cascade_level||1)-1 ? 600 : 400 }}>
              {i === (org?.cascade_level||1)-1 ? org?.name : `Level ${i+1}`}
            </span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width: (org?.cascade_level||1) * 14 }} />
          <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--scaled)" }} />
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem",
            color:"var(--scaled)", fontWeight:600 }}>
            {name || "Nueva área"} ← nuevo
          </span>
        </div>
      </div>

      <div style={{ fontWeight:600, fontSize:"0.875rem", color:"var(--text)", marginBottom:6 }}>
        Bets y alineación
      </div>
      <p style={{ fontSize:"0.8125rem", color:"var(--t2)", lineHeight:1.6 }}>
        Los bets creados en esta unidad pueden alinearse a objetivos de {org?.name}. Podés agregar sub-áreas propias después de crearla.
      </p>
    </div>
  );

  if (isTrialOrg) {
    return (
      <Modal title="Función Pro" subtitle="Sub-áreas no disponibles en el plan trial">
        <div style={{ textAlign:"center", padding:"24px 0 16px" }}>
          <div style={{ fontSize:"3rem", marginBottom:16 }}>🔒</div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.25rem",
            color:"var(--text)", marginBottom:12 }}>
            Las sub-áreas son una función Pro
          </div>
          <p style={{ fontFamily:"var(--font-body)", fontSize:"0.9375rem", color:"var(--t2)",
            lineHeight:1.7, marginBottom:32 }}>
            El plan trial incluye una sola organización sin jerarquía. Activá Pro para crear una estructura multinivel con áreas, sub-equipos y cascade de bets.
          </p>
          <a href="mailto:hello@sprintal.com?subject=Activar plan Pro"
            style={{ display:"inline-block", padding:"12px 28px",
              background:"var(--brand)", color:"#fff", borderRadius:"var(--r)",
              fontFamily:"var(--font-body)", fontWeight:600, fontSize:"0.9375rem",
              textDecoration:"none", marginBottom:12 }}>
            Contactar para activar Pro →
          </a>
        </div>
        <ModalFooter>
          <button onClick={() => router.back()} className="btn-ghost flex-1">Volver</button>
        </ModalFooter>
      </Modal>
    );
  }

  if ((org?.cascade_level || 1) >= 4) {
    return (
      <Modal title="Nivel máximo alcanzado" subtitle="No se pueden crear más áreaes.">
        <p style={{ color:"var(--t2)" }}>La jerarquía máxima es L1 → L2 → L3 → L4.</p>
        <ModalFooter>
          <button onClick={() => router.back()} className="btn-ghost flex-1">Volver</button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Nueva área bajo ${org?.name}`}
      subtitle={org?.name}
      sidebar={SIDEBAR}>
      <form onSubmit={save}>

        <Field label="Nombre de la unidad">
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Marketing Team, BU América, Centro Regional LATAM"
            required autoFocus />
        </Field>

        <Field label="¿Bajo qué área del área superior opera?" hint="opcional">
          <select className="input" value={parentArea} onChange={e => setParentArea(e.target.value)}>
            <option value="">— Satélite / transversal —</option>
            {localAreas.map(a => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
          <div style={{ fontSize:"0.75rem", color:"var(--t3)", marginTop:4 }}>
            {parentArea
              ? `Opera bajo el área "${parentArea}" de ${org?.name}.`
              : "No depende de un área específica — opera en forma transversal."}
          </div>
        </Field>

        {error && (
          <div style={{ padding:"10px 14px", borderRadius:"var(--rs)", marginBottom:8,
            background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)",
            color:"var(--killed)", fontSize:"0.875rem" }}>
            {error}
          </div>
        )}

        <ModalFooter>
          <button type="button" onClick={() => router.back()} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Creando..." : "Crear área →"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
