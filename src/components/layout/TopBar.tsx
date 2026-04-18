"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Organization } from "@/types";

export default function TopBar({ orgSlug }: { orgSlug: string }) {
  const store = useStore();
  const org = store.org;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [parentOrg, setParentOrg] = useState<Organization | null>(null);
  const [siblings, setSiblings] = useState<Organization[]>([]);
  const [localChildren, setLocalChildren] = useState<(Organization & { _navigable?: boolean })[]>([]);

  useEffect(() => {
    async function load() {
      const { data: orgData } = await supabase
        .from("organizations").select("*").eq("slug", orgSlug).single();
      if (!orgData) return;

      const { data: children } = await supabase
        .from("organizations").select("*").eq("parent_org_id", orgData.id);
      if (children?.length) {
        const { data: grandchildren } = await supabase
          .from("organizations").select("parent_org_id")
          .in("parent_org_id", children.map((c: Organization) => c.id));
        const navigableIds = new Set((grandchildren || []).map((g: { parent_org_id: string }) => g.parent_org_id));
        setLocalChildren(children.map((c: Organization) => ({ ...c, _navigable: navigableIds.has(c.id) })));
      }
    }
    load();
  }, [orgSlug]);

  async function openDropdown() {
    if (org?.parent_org_id) {
      const { data: parent } = await supabase
        .from("organizations").select("*").eq("id", org.parent_org_id).maybeSingle();
      setParentOrg(parent);
      const { data: sibs } = await supabase
        .from("organizations").select("*")
        .eq("parent_org_id", org.parent_org_id).neq("id", org.id);
      setSiblings((sibs || []).filter((s: Organization & { _navigable?: boolean }) => true));
    }
    setOpen(true);
  }

  function navigateTo(slug: string) {
    setOpen(false);
    router.push(`/${slug}/dashboard`);
  }

  const hasNav = localChildren.length > 0 || !!org?.parent_org_id;

  return (
    <div style={{
      height: 52, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      position: "relative", zIndex: 30,
    }}>
      {/* Left — org name */}
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: "1rem", color: "var(--text)",
        letterSpacing: "-0.02em",
      }}>
        {org?.name || "—"}
      </div>

      {/* Right — area switcher — fixed width */}
      <div style={{ position: "relative" }}>
        <button
          onClick={hasNav ? openDropdown : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: 200, padding: "6px 12px",
            background: open ? "var(--brand-bg)" : "var(--raised)",
            border: `1px solid ${open ? "var(--brand)" : "var(--border-mid)"}`,
            borderRadius: "var(--r)",
            cursor: hasNav ? "pointer" : "default",
            transition: "border-color 0.15s, background 0.15s",
          }}>
          {/* Org avatar */}
          <div style={{
            width: 22, height: 22, borderRadius: 4, flexShrink: 0,
            background: org?.primary_color || "var(--brand)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6875rem", fontWeight: 700, fontFamily: "var(--font-display)",
          }}>
            {org?.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <span style={{
            fontFamily: "var(--font-body)", fontWeight: 600,
            fontSize: "0.875rem", color: "var(--text)",
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textAlign: "left",
          }}>
            {org?.name || "—"}
          </span>
          {hasNav && (
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "0.625rem",
              color: open ? "var(--brand)" : "var(--t3)",
              flexShrink: 0, transition: "transform 0.15s",
              display: "inline-block",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}>
              ▼
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
              width: 260, maxHeight: "70vh", overflow: "auto",
              background: "var(--bg)", border: "1px solid var(--border-mid)",
              borderRadius: "var(--r)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}>
              {/* Parent */}
              {parentOrg && (
                <div style={{ padding: "8px 0 4px" }}>
                  <div style={{ padding: "4px 16px 2px", fontFamily: "var(--font-body)",
                    fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "var(--t3)" }}>↑ Up</div>
                  <AreaItem org={parentOrg} current={false} navigable={true}
                    onClick={() => navigateTo(parentOrg.slug)} />
                </div>
              )}

              {/* Current */}
              <div style={{ padding: "8px 0 4px", borderTop: parentOrg ? "1px solid var(--border)" : "none" }}>
                <div style={{ padding: "4px 16px 2px", fontFamily: "var(--font-body)",
                  fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
                  textTransform: "uppercase", color: "var(--t3)" }}>Current</div>
                {org && <AreaItem org={org} current={true} navigable={true} onClick={() => setOpen(false)} />}
              </div>

              {/* Siblings */}
              {siblings.length > 0 && (
                <div style={{ padding: "8px 0 4px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ padding: "4px 16px 2px", fontFamily: "var(--font-body)",
                    fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "var(--t3)" }}>Same level</div>
                  {siblings.map(s => (
                    <AreaItem key={s.id} org={s} current={false} navigable={true}
                      onClick={() => navigateTo(s.slug)} />
                  ))}
                </div>
              )}

              {/* Children */}
              {localChildren.length > 0 && (
                <div style={{ padding: "8px 0 8px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ padding: "4px 16px 2px", fontFamily: "var(--font-body)",
                    fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "var(--t3)" }}>Areas</div>
                  {localChildren.map(c => (
                    <AreaItem key={c.id} org={c} current={false}
                      navigable={!!c._navigable}
                      onClick={() => c._navigable ? navigateTo(c.slug) : undefined} />
                  ))}
                </div>
              )}

              {/* New area — Pro only */}
              <div style={{ padding: "4px 0 8px", borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => { setOpen(false); router.push(`/${orgSlug}/new/sub-org`); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "7px 16px",
                    background: "none", border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)", fontSize: "0.875rem",
                    color: org?.plan === "trial" ? "var(--t3)" : "var(--brand)",
                  }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight: 700 }}>+</span> New Area
                  </span>
                  {org?.plan === "trial" && (
                    <span style={{ fontSize:"0.6875rem", fontFamily:"var(--font-body)",
                      padding:"1px 6px", borderRadius:3,
                      background:"var(--raised)", border:"1px solid var(--border-mid)",
                      color:"var(--t3)" }}>
                      Pro
                    </span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AreaItem({ org, current, navigable, onClick }: {
  org: Organization; current: boolean; navigable: boolean; onClick: () => void;
}) {
  return (
    <button onClick={navigable && !current ? onClick : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 16px",
        background: current ? "var(--brand-bg)" : "none",
        border: "none",
        cursor: current ? "default" : navigable ? "pointer" : "default",
        textAlign: "left",
        borderLeft: current ? "2px solid var(--brand)" : "2px solid transparent",
        opacity: navigable || current ? 1 : 0.45,
      }}>
      <div style={{
        width: 26, height: 26, borderRadius: 5, flexShrink: 0,
        background: current ? "var(--brand)" : "var(--raised)",
        color: current ? "#fff" : "var(--t2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.75rem", fontWeight: 700,
      }}>
        {org.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: "var(--font-body)", fontWeight: current ? 600 : 400,
          fontSize: "0.875rem",
          color: current ? "var(--brand)" : "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {org.name}
        </div>
        {!navigable && !current && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--t3)" }}>
            no sub-areas
          </div>
        )}
      </div>
      {current && <div style={{ color: "var(--brand)", fontSize: "0.75rem" }}>✓</div>}
    </button>
  );
}
