"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import {
  IconBrandS,
  IconDashboard,
  IconSprints,
  IconBets,
  IconBetsTable,
  IconEvidence,
  IconNewSprint,
  IconNewBet,
  IconSignal,
  IconReview,
  IconCloseSprint,
  IconSettings,
  IconBilling,
  IconSignOut,
} from "@/components/layout/SidebarIcons";

const AREA_DOTS = ["#EC4899","#22C55E","#EAA012","#7C3AED","#2563EB","#0891B2","#F97316","#DC2626"];

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function AppSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org, childOrgs, reset, currentRole, ancestorReadOnly } = useStore();
  const perms = usePermissions(currentRole, { readOnlyAncestor: ancestorReadOnly });
  const base = `/${orgSlug}`;
  const t = useT();
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

  const coreNav: NavItem[] = [
    { href: `${base}/dashboard`, label: t("nav.dashboard"), icon: <IconDashboard /> },
    { href: `${base}/sprints`, label: t("nav.sprints"), icon: <IconSprints /> },
    { href: `${base}/bets/board`, label: t("nav.betsBoard"), icon: <IconBets /> },
    { href: `${base}/bets/table`, label: t("nav.betsTable"), icon: <IconBetsTable /> },
    { href: `${base}/evidence`, label: t("nav.evidence"), icon: <IconEvidence /> },
  ];

  const actionNav: NavItem[] = [
    { href: `${base}/new/sprint`, label: t("actions.newSprint"), icon: <IconNewSprint /> },
    { href: `${base}/new/bet`, label: t("actions.newBet"), icon: <IconNewBet /> },
    { href: `${base}/new/signal`, label: t("actions.signalCheck"), icon: <IconSignal /> },
    { href: `${base}/new/review`, label: t("actions.strategicReview"), icon: <IconReview /> },
    { href: `${base}/new/closure`, label: t("actions.closeSprint"), icon: <IconCloseSprint /> },
  ].filter((item) => {
    if (item.href.endsWith("/new/sprint")) return perms.canCreateSprint;
    if (item.href.endsWith("/new/bet")) return perms.canCreateBet;
    if (item.href.endsWith("/new/signal")) return perms.canSignalCheck;
    if (item.href.endsWith("/new/review")) return perms.canReview;
    if (item.href.endsWith("/new/closure")) return perms.canCloseSprint;
    return true;
  });

  const sidebarWidth = collapsed ? 52 : 224;

  function renderCollapsedLink(item: NavItem) {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.label}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 0",
          margin: "1px 0",
          borderRadius: "var(--rs)",
          textDecoration: "none",
          color: active ? "var(--brand)" : "var(--t2)",
          background: active ? "var(--brand-bg)" : "transparent",
          transition: "all 0.1s",
        }}
      >
        <span style={{ display: "flex", color: active ? "var(--brand)" : "var(--t2)" }}>
          {item.icon}
        </span>
      </Link>
    );
  }

  return (
    <aside style={{
      width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: "var(--sidebar)", borderRight: "1px solid var(--border)",
      overflowY: "auto", overflowX: "hidden",
      transition: "width 0.2s ease, min-width 0.2s ease",
    }}>

      <div style={{ padding: collapsed ? "14px 10px 12px" : "14px 16px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {collapsed ? (
          <IconBrandS />
        ) : (
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.25rem",
            color:"var(--brand)", letterSpacing:"-0.03em" }}>
            Sprintal
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:"var(--t3)", fontSize:"1rem", padding:2, lineHeight:1,
            display:"flex", alignItems:"center", justifyContent:"center",
            marginLeft: collapsed ? 0 : undefined }}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav style={{ flex:1, padding:"8px 0", overflowY:"auto", overflowX:"hidden" }}>

        <div style={{ padding:"8px 0 4px" }}>
          {!collapsed && <div className="nav-group-label">{t("nav.core")}</div>}
          {collapsed
            ? coreNav.map(renderCollapsedLink)
            : coreNav.map(item => {
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
                    <span style={{ display:"flex", color: active ? "var(--brand)" : "var(--t2)" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
        </div>

        {actionNav.length > 0 && (
          <div style={{ padding:"8px 0 4px" }}>
            {!collapsed && <div className="nav-group-label">{t("nav.actions")}</div>}
            {collapsed
              ? actionNav.map(renderCollapsedLink)
              : actionNav.map(item => {
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
                      <span style={{ display:"flex", color: active ? "var(--brand)" : "var(--t2)" }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
          </div>
        )}

        {!collapsed && childOrgs.length > 0 && (
          <div style={{ padding:"8px 0 4px" }}>
            <div className="nav-group-label">{t("nav.byArea")}</div>
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

      <div style={{ padding: collapsed ? "12px 0" : "12px 16px",
        borderTop:"1px solid var(--border)",
        display:"flex", flexDirection: "column",
        alignItems: collapsed ? "center" : "flex-start", gap:8 }}>
        {!collapsed ? (
          <>
            {!ancestorReadOnly && (
              <>
                <Link href={`${base}/settings`}
                  style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.8125rem", fontFamily:"var(--font-body)",
                    color:"var(--t3)", textDecoration:"none" }}>
                  <IconSettings />
                  {t("nav.settings")}
                </Link>
                <Link href={`${base}/billing`}
                  style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.8125rem", fontFamily:"var(--font-body)",
                    color:"var(--t3)", textDecoration:"none" }}>
                  <IconBilling />
                  {t("nav.billing")}
                </Link>
              </>
            )}
            <button onClick={async()=>{ await supabase.auth.signOut(); reset(); router.push("/auth/login"); }}
              style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.8125rem", fontFamily:"var(--font-body)", color:"var(--t3)",
                background:"none", border:"none", cursor:"pointer", padding:0 }}>
              <IconSignOut />
              {t("nav.signOut")}
            </button>
          </>
        ) : (
          <>
            {!ancestorReadOnly && (
              <>
                <Link href={`${base}/settings`} title={t("nav.settings")}
                  style={{ color:"var(--t2)", textDecoration:"none", display:"flex" }}>
                  <IconSettings />
                </Link>
                <Link href={`${base}/billing`} title={t("nav.billing")}
                  style={{ color:"var(--t2)", textDecoration:"none", display:"flex" }}>
                  <IconBilling />
                </Link>
              </>
            )}
            <button onClick={async()=>{ await supabase.auth.signOut(); reset(); router.push("/auth/login"); }}
              title={t("nav.signOut")}
              style={{ color:"var(--t2)", background:"none", border:"none", cursor:"pointer",
                padding:0, display:"flex" }}>
              <IconSignOut />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
