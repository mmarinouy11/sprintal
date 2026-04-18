"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const AREA_DOTS = ["#EC4899","#22C55E","#EAA012","#7C3AED","#2563EB","#0891B2","#F97316","#DC2626"];

export default function AppSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org, childOrgs, reset, currentRole } = useStore();
  const perms = usePermissions(currentRole);
  const base = `/${orgSlug}`;

  const coreNav = [
    { href:`${base}/dashboard`,  label:"Executive Dashboard", dot:"var(--brand)" },
    { href:`${base}/sprints`,    label:"Enterprise Sprints",  dot:"var(--active)" },
    { href:`${base}/bets/board`, label:"Bets — Board",        dot:"var(--unclear)" },
    { href:`${base}/bets/table`, label:"Bets — Table",        dot:"var(--t3)" },
    { href:`${base}/evidence`,   label:"Evidence Log",        dot:"var(--pivoted)" },
  ];

  const actionNav = [
    { href:`${base}/new/sprint`,  label:"New Sprint",        show: perms.canCreateSprint },
    { href:`${base}/new/bet`,     label:"New Bet", show: perms.canCreateBet },
    { href:`${base}/new/signal`,  label:"Signal Check",      show: perms.canSignalCheck },
    { href:`${base}/new/review`,  label:"Strategic Review",  show: perms.canReview },
    { href:`${base}/new/closure`, label:"Close Sprint",      show: perms.canCloseSprint },
  ].filter(item => item.show);

  return (
    <aside className="w-56 min-w-56 flex flex-col"
      style={{ background:"var(--sidebar)", borderRight:"1px solid var(--border)", overflowY:"auto" }}>

      {/* Brand */}
      <div style={{ padding:"14px 16px 12px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.25rem",
          color:"var(--brand)", letterSpacing:"-0.03em" }}>
          Sprintal
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>

        {/* Core */}
        <div style={{ padding:"8px 0 4px" }}>
          <div className="nav-group-label">Core</div>
          {coreNav.map(item => {
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
                <span style={{ width:6, height:6, borderRadius:"50%", background:item.dot, flexShrink:0 }}/>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Actions */}
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
                <span style={{ color:"var(--brand)", fontSize:"1rem", fontWeight:700, lineHeight:1, width:6, textAlign:"center" }}>+</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* By Area — uses child orgs */}
        {childOrgs.length > 0 && (
          <div style={{ padding:"8px 0 4px" }}>
            <div className="nav-group-label">By Area</div>
            {childOrgs.map((area, i) => {
              const href = `${base}/bets/table?area=${encodeURIComponent(area.name)}`;
              const active = pathname + (typeof window !== 'undefined' ? window.location.search : '') === href;
              return (
                <Link key={area.id} href={href}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"7px 12px", margin:"1px 6px",
                    borderRadius:"var(--rs)", textDecoration:"none",
                    fontSize:"0.875rem", fontFamily:"var(--font-body)",
                    fontWeight: active ? 600 : 400,
                    color: active ? AREA_DOTS[i % AREA_DOTS.length] : "var(--t2)",
                    background: "transparent",
                    transition:"all 0.1s",
                  }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:AREA_DOTS[i % AREA_DOTS.length], flexShrink:0 }}/>
                  {area.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)" }}>
        <Link href={`${base}/settings`}
          style={{ display:"block", fontSize:"0.8125rem", fontFamily:"var(--font-body)", color:"var(--t3)", textDecoration:"none", marginBottom:8 }}>
          ⚙ Settings
        </Link>
        <button onClick={async()=>{ await supabase.auth.signOut(); reset(); router.push("/auth/login"); }}
          style={{ fontSize:"0.8125rem", fontFamily:"var(--font-body)", color:"var(--t3)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
          ↪ Sign out
        </button>
      </div>
    </aside>
  );
}
