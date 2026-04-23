"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { COACH_LIMITS } from "@/types";
import type { Plan, OrgRole, OrgMember, CoachUsage } from "@/types";

// ── Tab navigation ───────────────────────────────────────────
type Tab = "org" | "members" | "coach" | "language";

// ── Plan display helpers ─────────────────────────────────────
const PLAN_LABELS: Record<Plan, string> = {
  trial: "Trial", solo: "Solo", starter: "Starter", growth: "Growth", scale: "Scale"
};

const VALID_PLANS: Plan[] = ["trial", "solo", "starter", "growth", "scale"];
const isPlan = (value: unknown): value is Plan =>
  typeof value === "string" && VALID_PLANS.includes(value as Plan);

function PlanBadge({ plan }: { plan: Plan }) {
  const colors: Record<Plan, string> = {
    trial: "var(--t3)", solo: "var(--brand)", starter: "var(--brand)",
    growth: "var(--scaled)", scale: "var(--unclear)"
  };
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${colors[plan]} 12%, transparent)`, color: colors[plan], border: `1px solid color-mix(in srgb, ${colors[plan]} 25%, transparent)` }}>
      {PLAN_LABELS[plan]}
    </span>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit === -1) return <span style={{ fontSize: "0.8125rem", color: "var(--scaled)" }}>Unlimited</span>;
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct > 90 ? "var(--killed)" : pct > 70 ? "var(--unclear)" : "var(--scaled)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--raised)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "0.8125rem", color: "var(--t2)", minWidth: 60 }}>{used} / {limit}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function SettingsPage() {
  const { org, role, childOrgs, updateOrg } = useStore();
  const t = useT();
  const [tab, setTab] = useState<Tab>("org");
  const [displayPlan, setDisplayPlan] = useState<Plan>("trial");
  const isOwner = role === "owner";
  const isAdmin = role === "owner" || role === "admin";
  const orgId = org?.id;
  const orgPlan = org?.plan;

  useEffect(() => {
    if (!orgId) return;

    // Use a fresh DB read for plan to avoid stale or transformed in-memory state.
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("plan")
        .eq("id", orgId)
        .maybeSingle();

      if (cancelled) return;

      const freshPlan = data?.plan;
      if (isPlan(freshPlan)) {
        setDisplayPlan(freshPlan);
        if (orgPlan !== freshPlan) updateOrg({ plan: freshPlan });
        return;
      }

      setDisplayPlan(isPlan(orgPlan) ? orgPlan : "trial");
    })();

    return () => { cancelled = true; };
  }, [orgId, orgPlan, updateOrg]);

  if (!org) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "org", label: t("settings.org") },
    { id: "members", label: t("settings.members") },
    { id: "coach", label: t("settings.coach") },
    { id: "language", label: t("settings.language") },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bold text-2xl mb-1" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
          {t("settings.title")}
        </h1>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "0.875rem", color: "var(--t2)" }}>{org.name}</span>
          <PlanBadge plan={displayPlan} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map(tab_ => (
          <button key={tab_.id} onClick={() => setTab(tab_.id)}
            style={{
              padding: "8px 16px", fontSize: "0.875rem", fontFamily: "var(--font-body)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: tab === tab_.id ? "2px solid var(--brand)" : "2px solid transparent",
              color: tab === tab_.id ? "var(--brand)" : "var(--t2)",
              fontWeight: tab === tab_.id ? 600 : 400,
              marginBottom: -1,
            }}>
            {tab_.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "org" && <OrgTab org={org} isAdmin={isAdmin} />}
      {tab === "members" && <MembersTab org={org} isAdmin={isAdmin} />}
      {tab === "coach" && <CoachTab org={org} childOrgs={childOrgs} isAdmin={isAdmin} />}
      {tab === "language" && <LanguageTab />}
    </div>
  );
}

// ── Org Tab ──────────────────────────────────────────────────
function OrgTab({ org, isAdmin }: { org: any; isAdmin: boolean }) {
  const t = useT();
  const { updateOrg } = useStore();
  const [name, setName] = useState(org.name);
  const [color, setColor] = useState(org.primary_color || "#5C6AC4");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const nextColor = org.primary_color || "#5C6AC4";
    console.log("[sprintal-debug] OrgTab sync from org prop", {
      orgId: org.id,
      orgName: org.name,
      primary_color: org.primary_color,
      appliedColor: nextColor,
      at: new Date().toISOString(),
    });
    setName(org.name);
    setColor(nextColor);
  }, [org.id, org.name, org.primary_color]);

  async function save() {
    setSaving(true);
    setSaveError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSaveError(t("settings.saveError"));
      setSaving(false);
      return;
    }

    const res = await fetch("/api/settings/update-org", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        orgId: org.id,
        name,
        primaryColor: color,
      }),
    });

    const payload = await res.json();
    console.log("[sprintal-debug] settings save request/response", {
      orgId: org.id,
      sentName: name,
      sentPrimaryColor: color,
      status: res.status,
      receivedOrgId: payload?.org?.id ?? null,
      receivedPrimaryColor: payload?.org?.primary_color ?? null,
      receivedName: payload?.org?.name ?? null,
      rawError: payload?.error ?? null,
      at: new Date().toISOString(),
    });

    if (!res.ok || !payload?.org) {
      setSaveError(t("settings.saveError"));
      setSaving(false);
      return;
    }

    updateOrg({ name: payload.org.name, primary_color: payload.org.primary_color });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6">
        <label className="t-label mb-2 block">{t("settings.orgName")}</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)}
          disabled={!isAdmin} style={{ maxWidth: 400 }} />
      </div>
      <div className="mb-6">
        <label className="t-label mb-2 block">{t("settings.brandColor")}</label>
        <div className="flex items-center gap-3">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            disabled={!isAdmin}
            style={{ width: 48, height: 48, borderRadius: "var(--rs)", border: "1px solid var(--border-mid)", cursor: isAdmin ? "pointer" : "default", padding: 2 }} />
          <input className="input" value={color} onChange={e => setColor(e.target.value)}
            disabled={!isAdmin} style={{ maxWidth: 120, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, border: "1px solid var(--border-mid)" }} />
        </div>
      </div>
      {isAdmin && (
        <>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? t("common.loading") : saved ? `✓ ${t("settings.saved")}` : t("settings.save")}
          </button>
          {saveError && (
            <p style={{ fontSize: "0.8125rem", marginTop: 8, color: "var(--killed)" }}>
              {saveError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Members Tab ──────────────────────────────────────────────
function MembersTab({ org, isAdmin }: { org: any; isAdmin: boolean }) {
  const t = useT();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("org_members").select("*").eq("org_id", org.id)
      .then(({ data }) => { if (data) setMembers(data); setLoading(false); });
  }, [org.id]);

  async function invite() {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/settings/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ orgId: org.id, email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (data.success) {
      setInviteMsg(t("settings.inviteSent"));
      setInviteEmail("");
    } else {
      setInviteMsg(data.error || t("settings.inviteError"));
    }
    setInviting(false);
  }

  async function changeRole(memberId: string, newRole: OrgRole) {
    await supabase.from("org_members").update({ role: newRole }).eq("id", memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  }

  async function removeMember(memberId: string) {
    if (!confirm(t("settings.confirmRemove"))) return;
    await supabase.from("org_members").delete().eq("id", memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  const ROLES: OrgRole[] = ["owner", "admin", "editor", "viewer"];

  return (
    <div>
      {/* Invite form */}
      {isAdmin && (
        <div className="mb-8 p-5 rounded-lg" style={{ background: "var(--sidebar)", border: "1px solid var(--border)" }}>
          <div className="t-label mb-3">{t("settings.inviteMember")}</div>
          <div className="flex gap-3 flex-wrap">
            <input className="input flex-1" style={{ minWidth: 200 }}
              type="email" placeholder={t("settings.emailPlaceholder")}
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && invite()} />
            <select className="input" style={{ width: 130 }} value={inviteRole} onChange={e => setInviteRole(e.target.value as OrgRole)}>
              {ROLES.filter(r => r !== "owner").map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <button onClick={invite} disabled={inviting || !inviteEmail} className="btn-primary">
              {inviting ? t("common.loading") : t("settings.invite")}
            </button>
          </div>
          {inviteMsg && <p style={{ fontSize: "0.875rem", marginTop: 8, color: inviteMsg.includes("error") || inviteMsg.includes("Error") ? "var(--killed)" : "var(--scaled)" }}>{inviteMsg}</p>}
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <p style={{ color: "var(--t2)", fontSize: "0.875rem" }}>{t("common.loading")}</p>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3"
              style={{ borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--bg)" : "var(--sidebar)" }}>
              <div className="flex-1">
                <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text)" }}>{m.full_name || "—"}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--t2)", fontFamily: "var(--font-mono)" }}>{m.email || m.user_id?.slice(0, 8)}</div>
              </div>
              {isAdmin && m.role !== "owner" ? (
                <select className="input" style={{ width: 110, fontSize: "0.8125rem" }}
                  value={m.role} onChange={e => changeRole(m.id, e.target.value as OrgRole)}>
                  {ROLES.filter(r => r !== "owner").map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span className="badge">{m.role}</span>
              )}
              {isAdmin && m.role !== "owner" && (
                <button onClick={() => removeMember(m.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--killed)", fontSize: "1rem", padding: "2px 6px" }}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Coach Tab ────────────────────────────────────────────────
function CoachTab({ org, childOrgs, isAdmin }: { org: any; childOrgs: any[]; isAdmin: boolean }) {
  const t = useT();
  const [localOrgs, setLocalOrgs] = useState<any[]>([]);
  const [usage, setUsage] = useState<CoachUsage | null>(null);
  const [areaUsage, setAreaUsage] = useState<Record<string, CoachUsage>>({});
  const [toggling, setToggling] = useState<string | null>(null);

  const month = new Date().toISOString().slice(0, 7);

  // Derive plan from localOrgs (fresh DB) once loaded, else fall back to org.plan
  const rootLocal = localOrgs.find(o => o.id === org.id);
  const plan = ((rootLocal?.plan || org.plan || "trial") as Plan);
  const limits = COACH_LIMITS[plan] || COACH_LIMITS["trial"];

  useEffect(() => {
    // Load orgs with fresh coach settings AND plan from DB
    const allIds = [org.id, ...childOrgs.map((a: any) => a.id)];
    supabase.from("organizations")
      .select("id, name, plan, coach_syntactic_enabled, coach_semantic_enabled, parent_org_id")
      .in("id", allIds)
      .then(({ data }) => {
        if (data) setLocalOrgs(data);
      });
    // Load usage
    supabase.from("coach_usage").select("*").eq("org_id", org.id).eq("month", month)
      .maybeSingle().then(({ data }) => setUsage(data));
    if (childOrgs.length > 0) {
      const ids = childOrgs.map((a: any) => a.id);
      supabase.from("coach_usage").select("*").in("org_id", ids).eq("month", month)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, CoachUsage> = {};
            data.forEach(u => { map[u.org_id] = u; });
            setAreaUsage(map);
          }
        });
    }
  }, [org.id, month]);

  async function toggleCoach(orgId: string, field: "coach_syntactic_enabled" | "coach_semantic_enabled", current: boolean) {
    setToggling(orgId + field);
    const { error } = await supabase.from("organizations").update({ [field]: !current }).eq("id", orgId);
    if (!error) {
      // Update local state — no reload needed
      setLocalOrgs(prev => prev.map(o => o.id === orgId ? { ...o, [field]: !current } : o));
    }
    setToggling(null);
  }

  const semanticAvailable = limits.semantic > 0 || limits.semantic === -1;

  function Toggle({ enabled, onClick, disabled }: { enabled: boolean; onClick: () => void; disabled?: boolean }) {
    return (
      <button onClick={onClick} disabled={disabled}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: disabled ? "default" : "pointer",
          background: enabled ? "var(--brand)" : "var(--raised)",
          position: "relative", transition: "background 0.2s", opacity: disabled ? 0.5 : 1,
          flexShrink: 0,
        }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3, left: enabled ? 21 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    );
  }

  function UpgradeBadge({ nextPlan }: { nextPlan: string }) {
    return (
      <span style={{
        fontSize: "0.75rem", padding: "2px 8px", borderRadius: 10,
        background: "color-mix(in srgb, var(--unclear) 12%, transparent)",
        color: "var(--unclear)", border: "1px solid color-mix(in srgb, var(--unclear) 25%, transparent)",
        whiteSpace: "nowrap",
      }}>
        {t("settings.availableIn")} {nextPlan} →
      </span>
    );
  }

  // All orgs to show — use localOrgs (fresh from DB) with fallback
  const allOrgs = localOrgs.length > 0
    ? localOrgs.map(o => ({ ...o, isRoot: o.id === org.id }))
    : [{ ...org, isRoot: true }, ...childOrgs.map(a => ({ ...a, isRoot: false }))];

  return (
    <div>
      {/* Plan summary */}
      <div className="mb-6 p-5 rounded-lg" style={{ background: "var(--sidebar)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>{t("settings.planUsage")}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--t2)", fontFamily: "var(--font-mono)" }}>{month}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="t-label mb-2">{t("settings.syntacticCalls")}</div>
            <UsageBar used={usage?.syntactic_calls || 0} limit={limits.syntactic} />
          </div>
          <div>
            <div className="t-label mb-2">{t("settings.semanticCalls")}</div>
            {semanticAvailable
              ? <UsageBar used={usage?.semantic_calls || 0} limit={limits.semantic} />
              : <UpgradeBadge nextPlan="Starter" />
            }
          </div>
        </div>
      </div>

      {/* Areas table */}
      <div className="t-label mb-3">{t("settings.coachByArea")}</div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
        {/* Header */}
        <div className="grid px-5 py-2" style={{ gridTemplateColumns: "1fr 80px 80px 140px 140px", background: "var(--raised)", borderBottom: "1px solid var(--border)", fontSize: "0.75rem", fontWeight: 700, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <div>{t("settings.area")}</div>
          <div style={{ textAlign: "center" }}>{t("settings.syntactic")}</div>
          <div style={{ textAlign: "center" }}>{t("settings.semantic")}</div>
          <div>{t("settings.syntacticUsage")}</div>
          <div>{t("settings.semanticUsage")}</div>
        </div>
        {allOrgs.map((a, i) => {
          const u = a.isRoot ? usage : areaUsage[a.id];
          return (
            <div key={a.id} className="grid items-center px-5 py-3"
              style={{ gridTemplateColumns: "1fr 80px 80px 140px 140px", borderBottom: i < allOrgs.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--bg)" : "var(--sidebar)" }}>
              <div>
                <span style={{ fontSize: "0.875rem", color: "var(--text)", fontWeight: a.isRoot ? 600 : 400 }}>{a.name}</span>
                {a.isRoot && <span className="badge ml-2" style={{ fontSize: "0.6rem" }}>root</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                {isAdmin
                  ? <Toggle enabled={a.coach_syntactic_enabled} disabled={toggling === a.id + "coach_syntactic_enabled"} onClick={() => toggleCoach(a.id, "coach_syntactic_enabled", a.coach_syntactic_enabled)} />
                  : <span style={{ fontSize: "0.8125rem", color: a.coach_syntactic_enabled ? "var(--scaled)" : "var(--t3)" }}>{a.coach_syntactic_enabled ? "On" : "Off"}</span>
                }
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                {!semanticAvailable
                  ? <UpgradeBadge nextPlan="Starter" />
                  : isAdmin
                    ? <Toggle enabled={a.coach_semantic_enabled} disabled={toggling === a.id + "coach_semantic_enabled"} onClick={() => toggleCoach(a.id, "coach_semantic_enabled", a.coach_semantic_enabled)} />
                    : <span style={{ fontSize: "0.8125rem", color: a.coach_semantic_enabled ? "var(--scaled)" : "var(--t3)" }}>{a.coach_semantic_enabled ? "On" : "Off"}</span>
                }
              </div>
              <div><UsageBar used={u?.syntactic_calls || 0} limit={limits.syntactic} /></div>
              <div>
                {semanticAvailable
                  ? <UsageBar used={u?.semantic_calls || 0} limit={limits.semantic} />
                  : <span style={{ fontSize: "0.8125rem", color: "var(--t3)" }}>—</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Language Tab ─────────────────────────────────────────────
function LanguageTab() {
  const t = useT();
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    const cookies = document.cookie || "";
    const directMatch = cookies.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const directLocale = directMatch?.[1]?.trim().toLowerCase();
    if (directLocale && ["en", "es", "pt"].includes(directLocale)) {
      setLocale(directLocale);
      return;
    }

    // Defensive fallback for URL-encoded cookie keys/values.
    const encodedMatch = cookies.match(/NEXT_LOCALE%3D([^;]+)/i);
    const encodedRaw = encodedMatch?.[1] || "";
    let decoded = "";
    try {
      decoded = decodeURIComponent(encodedRaw).trim().toLowerCase();
    } catch {
      decoded = encodedRaw.trim().toLowerCase();
    }

    if (decoded && ["en", "es", "pt"].includes(decoded)) {
      setLocale(decoded);
      return;
    }

    const navLocale = navigator.language?.slice(0, 2).toLowerCase();
    if (navLocale === "es" || navLocale === "pt") {
      setLocale(navLocale);
    }
  }, []);

  const LANGS = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "pt", label: "Português" },
  ];

  function setLanguage(code: string) {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;
    setLocale(code);
    window.location.reload();
  }

  return (
    <div>
      <div className="t-label mb-4">{t("settings.language")}</div>
      <div className="flex flex-col gap-2" style={{ maxWidth: 300 }}>
        {LANGS.map(lang => (
          <button key={lang.code} onClick={() => setLanguage(lang.code)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
            style={{
              border: `1px solid ${locale === lang.code ? "var(--brand)" : "var(--border)"}`,
              background: locale === lang.code ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "var(--bg)",
              cursor: "pointer",
            }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", border: `2px solid ${locale === lang.code ? "var(--brand)" : "var(--border-mid)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {locale === lang.code && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand)" }} />}
            </div>
            <span style={{ fontSize: "0.875rem", color: "var(--text)", fontWeight: locale === lang.code ? 600 : 400 }}>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
