"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

type Member = {
  user_id: string;
  role: string;
  full_name: string | null;
  email?: string;
};

const ROLES = ["owner", "admin", "editor", "viewer"];

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 20, paddingBottom: 16,
        borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "1.125rem", color: "var(--text)", letterSpacing: "-0.01em" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
            color: "var(--t3)", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}


const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
] as const;

function LanguageSelector() {
  const [current, setCurrent] = useState<string>("en");

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match) setCurrent(match[1]);
  }, []);

  function setLocale(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
    setCurrent(code);
    window.location.reload();
  }

  return (
    <Section title="Language" subtitle="Interface language for this browser.">
      <div style={{ display: "flex", gap: 8 }}>
        {LANGS.map(lang => (
          <button key={lang.code} onClick={() => setLocale(lang.code)}
            style={{
              padding: "8px 16px", borderRadius: "var(--rs)",
              border: `1px solid ${current === lang.code ? "var(--brand)" : "var(--border-mid)"}`,
              background: current === lang.code ? "var(--brand-bg)" : "var(--surface)",
              color: current === lang.code ? "var(--brand)" : "var(--t2)",
              fontFamily: "var(--font-body)", fontSize: "0.875rem",
              fontWeight: current === lang.code ? 600 : 400, cursor: "pointer",
            }}>
            {lang.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { org, setOrg, currentRole } = useStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const t = useTranslations();
  const isOwner = currentRole === "owner";
  const isAdmin = currentRole === "admin" || isOwner;

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setColor(org.primary_color || "#5C6AC4");
    loadMembers();
  }, [org?.id]);

  async function loadMembers() {
    if (!org) return;
    setLoading(true);
    const { data } = await supabase
      .from("org_members").select("user_id, role, full_name")
      .eq("org_id", org.id);
    setMembers(data || []);
    setLoading(false);
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  async function saveOrgInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !isAdmin) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("organizations")
      .update({ name, primary_color: color })
      .eq("id", org.id).select().single();
    if (error) {
      showMessage("Error al guardar.", "error");
    } else {
      setOrg(data);
      showMessage("Cambios guardados.", "success");
    }
    setSaving(false);
  }

  async function updateRole(userId: string, newRole: string) {
    if (!org || !isOwner) return;
    const { error } = await supabase.from("org_members")
      .update({ role: newRole })
      .eq("org_id", org.id).eq("user_id", userId);
    if (!error) {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
      showMessage("Rol actualizado.", "success");
    }
  }

  async function removeMember(userId: string) {
    if (!org || !isOwner) return;
    if (!confirm("¿Eliminar este miembro?")) return;
    const { error } = await supabase.from("org_members")
      .delete().eq("org_id", org.id).eq("user_id", userId);
    if (!error) {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      showMessage("Miembro eliminado.", "success");
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "1.75rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
          Settings
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
          color: "var(--t3)", marginTop: 4 }}>
          {org?.name}
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 16px", borderRadius: "var(--rs)", marginBottom: 24,
          background: message.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(220,38,38,0.08)",
          border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}`,
          fontFamily: "var(--font-body)", fontSize: "0.875rem",
          color: message.type === "success" ? "var(--scaled)" : "var(--killed)" }}>
          {message.text}
        </div>
      )}

      {/* Org Info */}
      <Section title="Organization" subtitle="Basic information about this area.">
        <form onSubmit={saveOrgInfo}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "0.8125rem",
              fontWeight: 600, color: "var(--t2)", marginBottom: 6,
              letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Name
            </label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              disabled={!isAdmin} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "0.8125rem",
              fontWeight: 600, color: "var(--t2)", marginBottom: 6,
              letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Brand Color
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--rs)",
                  background: color, border: "1px solid var(--border-mid)",
                  cursor: isAdmin ? "pointer" : "default" }}
                  onClick={() => isAdmin && document.getElementById("colorPicker")?.click()} />
                <input id="colorPicker" type="color" value={color}
                  onChange={e => setColor(e.target.value)}
                  disabled={!isAdmin}
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
              </div>
              <input className="input" value={color} onChange={e => setColor(e.target.value)}
                disabled={!isAdmin} style={{ width: 120, fontFamily: "var(--font-body)" }} />
            </div>
          </div>
          {isAdmin && (
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </form>
      </Section>

      {/* Members */}
      <Section title="Members" subtitle="People with access to this area.">
        {loading ? (
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--t3)" }}>
            Loading...
          </div>
        ) : (
          <div style={{ borderRadius: "var(--r)", border: "1px solid var(--border)",
            overflow: "hidden", marginBottom: 20 }}>
            {members.map((m, i) => (
              <div key={m.user_id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none",
                background: "var(--surface)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "var(--brand)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.875rem" }}>
                  {(m.full_name || m.user_id).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 500,
                    fontSize: "0.875rem", color: "var(--text)" }}>
                    {m.full_name || "—"}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--t3)" }}>
                    {m.user_id.slice(0, 8)}...
                  </div>
                </div>
                {isOwner ? (
                  <select value={m.role} onChange={e => updateRole(m.user_id, e.target.value)}
                    style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem",
                      padding: "4px 8px", borderRadius: "var(--rs)",
                      border: "1px solid var(--border-mid)", background: "var(--raised)",
                      color: "var(--text)", cursor: "pointer" }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem",
                    padding: "3px 10px", borderRadius: "var(--rs)",
                    background: "var(--raised)", border: "1px solid var(--border)",
                    color: "var(--t2)" }}>
                    {m.role}
                  </span>
                )}
                {isOwner && (
                  <button onClick={() => removeMember(m.user_id)}
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "var(--t3)", fontSize: "1rem", padding: "4px",
                      borderRadius: "var(--rs)" }}
                    title="Remove member">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite — coming in Sprint 9 with OAuth */}
        {isAdmin && (
          <div style={{ padding: "14px 16px", borderRadius: "var(--r)",
            background: "var(--raised)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "1.25rem" }}>🔜</div>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600,
                fontSize: "0.875rem", color: "var(--text)" }}>
                Member invitations coming soon
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem",
                color: "var(--t3)", marginTop: 2 }}>
                To add members now, ask them to sign up at sprintal.com with their work email.
                Then contact us at hello@sprintal.com to link them to your organization.
              </div>
            </div>
          </div>
        )}
      </Section>


      {/* Language */}
      <LanguageSelector />
      {/* Plan */}
      <Section title="Plan" subtitle="Your current subscription.">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderRadius: "var(--r)",
          background: "var(--raised)", border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600,
              fontSize: "1rem", color: "var(--text)", textTransform: "capitalize" }}>
              {org?.plan || "trial"} Plan
            </div>
            {org?.plan === "trial" && org?.trial_ends_at && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--t3)", marginTop: 4 }}>
                Trial ends {new Date(org.trial_ends_at).toLocaleDateString()}
              </div>
            )}
          </div>
          {org?.plan === "trial" && (
            <a href="mailto:hello@sprintal.com?subject=Activar plan Pro"
              style={{ padding: "8px 16px", background: "var(--brand)", color: "#fff",
                borderRadius: "var(--rs)", textDecoration: "none",
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.875rem" }}>
              Upgrade to Pro →
            </a>
          )}
        </div>
      </Section>
    </div>
  );
}
