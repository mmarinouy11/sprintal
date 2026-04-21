"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const AREA_DOTS = ["#EC4899","#22C55E","#EAA012","#7C3AED","#2563EB","#0891B2","#F97316","#DC2626"];

export default function AppSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org, childOrgs, reset, currentRole } = useStore();
  const perms = usePermissions(currentRole);
  const base = `/${orgSlug}`;
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
      else setCollapsed(false);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const coreNav = [
    { href:`${base}/dashboard`,  label:"Executive Dashboard", dot:"var(--brand)",   icon:"◉" },
    { href:`${base}/sprints`,    label:"Enterprise Sprints",  dot:"var(--active)",  icon:"⚡" },
    { href:`${base}/bets/board`, label:"Bets — Board",        dot:"var(--unclear)", icon:"⬡" },
    { href:`${base}/bets/table`, label:"Bets — Table",        dot:"var(--t3)",      icon:"≡" },
    { href:`${base}/evidence`,   label:"Evidence Log",        dot:"var(--pivoted)", icon:"◎" },
  ];

  const actionNav = [
    { href:`${base}/new/sprint`,  label:"New Sprint",       show: perms.canCreateSprint },
    { href:`${base}/new/bet`,     label:"New Bet",          show: perms.canCreateBet },
    { href:`${base}/new/signal`,  label:"Signal Check",     show: perms.canSignalCheck },
    { href:`${base}/new/review`,  label:"Strategic Review", show: perms.canReview },
    { href:`${base}/new/closure`, label:"Close Sprint",     show: perms.canCloseSprint },
  ].filter(item => item.show);

  const sidebarWidth = collapsed ? 52 : 224;

  return (
    <aside style={{
      width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: "var(--sidebar)", borderRight: "1px solid var(--border)",
      overflowY: "auto", overflowX: "hidden",
      transition: "width 0.2s ease, min-width 0.2s ease",
    }}>

      {/* Brand */}
      <div style={{ padding: collapsed ? "14px 10px 12px" : "14px 16px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.25rem",
            color:"var(--brand)", letterSpacing:"-0.03em" }}>
            Sprintal
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:"var(--t3)", fontSize:"1rem", padding:2, lineHeight:1,
            display:"flex", alignItems:"center", justifyContent:"center" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"8px 0", overflowY:"auto", overflowX:"hidden" }}>

        {/* Core */}
        <div style={{ padding:"8px 0 4px" }}>
          {!collapsed && <div className="nav-group-label">Core</div>}
          {coreNav.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                title={collapsed ? item.label : undefined}
                style={{
                  display:"flex", alignItems:"center",
                  gap: collapsed ? 0 : 8,
                  padding: collapsed ? "8px 0" : "7px 12px",
                  margin: collapsed ? "1px 0" : "1px 6px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius:"var(--rs)", textDecoration:"none",
                  fontSize:"0.875rem", fontFamily:"var(--font-body)",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--brand)" : "var(--t2)",
                  background: active ? "var(--brand-bg)" : "transparent",
                  transition:"all 0.1s",
                }}>
                {collapsed
                  ? <span style={{ width:6, height:6, borderRadius:"50%",
                      background: active ? "var(--brand)" : item.dot, flexShrink:0 }}/>
                  : <>
                      <span style={{ width:6, height:6, borderRadius:"50%",
                        background:item.dot, flexShrink:0 }}/>
                      {item.label}
                    </>
                }
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        {!collapsed && (
          <div style={{ padding:"8px 0 4px" }}>
            <div className="nav-group-label">Actions</div>
            {actionNav.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"7px 12px", margin:"1px 6px",
                    borderRadius:"var(--rs)", textDecoration:"none",
                    fontSize:"0.875rem", fontFamily:"var(--font-body)",
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--brand)" : "var(--t2)",
                    background: active ? "var(--brand-bg)" : "transparent",
                    transition:"all 0.1s",
                  }}>
                  <span style={{ color:"var(--brand)", fontSize:"1rem", fontWeight:700,
                    lineHeight:1, width:6, textAlign:"center" }}>+</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* By Area */}
        {!collapsed && childOrgs.length > 0 && (
          <div style={{ padding:"8px 0 4px" }}>
            <div className="nav-group-label">By Area</div>
            {childOrgs.map((area, i) => {
              const href = `${base}/bets/table?area=${encodeURIComponent(area.name)}`;
              const active = pathname + (typeof window !== "undefined" ? window.location.search : "") === href;
              return (
                <Link key={area.id} href={href}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"7px 12px", margin:"1px 6px",
                    borderRadius:"var(--rs)", textDecoration:"none",
                    fontSize:"0.875rem", fontFamily:"var(--font-body)",
                    fontWeight: active ? 600 : 400,
                    color: active ? AREA_DOTS[i % AREA_DOTS.length] : "var(--t2)",
                    background:"transparent", transition:"all 0.1s",
                  }}>
                  <span style={{ width:6, height:6, borderRadius:"50%",
                    background:AREA_DOTS[i % AREA_DOTS.length], flexShrink:0 }}/>
                  {area.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? "12px 0" : "12px 16px",
        borderTop:"1px solid var(--border)",
        display:"flex", flexDirection: collapsed ? "column" : "column",
        alignItems: collapsed ? "center" : "flex-start", gap:8 }}>
        {!collapsed ? (
          <>
            <Link href={`${base}/settings`}
              style={{ display:"block", fontSize:"0.8125rem", fontFamily:"var(--font-body)",
                color:"var(--t3)", textDecoration:"none" }}>
              ⚙ Settings
            </Link>
            <button onClick={async()=>{ await supabase.auth.signOut(); reset(); router.push("/auth/login"); }}
              style={{ fontSize:"0.8125rem", fontFamily:"var(--font-body)", color:"var(--t3)",
                background:"none", border:"none", cursor:"pointer", padding:0 }}>
              ↪ Sign out
            </button>
          </>
        ) : (
          <>
            <Link href={`${base}/settings`} title="Settings"
              style={{ color:"var(--t3)", textDecoration:"none", fontSize:"1rem" }}>⚙</Link>
            <button onClick={async()=>{ await supabase.auth.signOut(); reset(); router.push("/auth/login"); }}
              title="Sign out"
              style={{ color:"var(--t3)", background:"none", border:"none", cursor:"pointer",
                fontSize:"1rem", padding:0 }}>↪</button>
          </>
        )}
      </div>
    </aside>
  );
}
