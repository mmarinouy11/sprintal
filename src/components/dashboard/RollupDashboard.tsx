"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Organization, Bet, Sprint } from "@/types";
import { useRouter } from "next/navigation";

interface ChildSummary {
  org: Organization;
  activeSprint: Sprint | null;
  betCount: number;
  strongCount: number;
  weakCount: number;
  bets: Bet[];
  hasChildren: boolean;
}

export default function RollupDashboard() {
  const { org, childOrgs } = useStore();
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!childOrgs.length) { setLoading(false); return; }
    async function load() {
      const results: ChildSummary[] = [];
      for (const child of childOrgs) {
        const [sprintsRes, betsRes, grandchildRes] = await Promise.all([
          supabase.from("sprints").select("*").eq("org_id", child.id).eq("status", "Active").maybeSingle(),
          supabase.from("bets").select("*").eq("org_id", child.id).eq("status", "Active"),
          supabase.from("organizations").select("id").eq("parent_org_id", child.id).limit(1),
        ]);
        const bets = betsRes.data || [];
        results.push({
          org: child,
          activeSprint: sprintsRes.data || null,
          betCount: bets.length,
          strongCount: bets.filter(b => b.signal === "Strong").length,
          weakCount: bets.filter(b => b.signal === "Weak").length,
          bets,
          hasChildren: (grandchildRes.data?.length || 0) > 0,
        });
      }
      setSummaries(results);
      setLoading(false);
    }
    load();
  }, [childOrgs]);

  if (!childOrgs.length) return null;

  // All direct children are cards — they represent areas of this level
  // Deeper descendants (grandchildren+) go in the table
  const directCards = summaries;

  // Load all descendants beyond direct children for the table
  const [descendants, setDescendants] = useState<{name: string; parentName: string; betCount: number; strongCount: number; weakCount: number}[]>([]);

  useEffect(() => {
    if (!childOrgs.length) return;
    async function loadDescendants() {
      const result = [];
      for (const child of childOrgs) {
        const { data: grandchildren } = await supabase
          .from("organizations").select("id, name")
          .eq("parent_org_id", child.id);
        if (!grandchildren?.length) continue;
        for (const gc of grandchildren) {
          const { data: bets } = await supabase
            .from("bets").select("signal, status")
            .eq("org_id", gc.id).eq("status", "Active");
          const betsData = bets || [];
          result.push({
            name: gc.name,
            parentName: child.name,
            betCount: betsData.length,
            strongCount: betsData.filter(b => b.signal === "Strong").length,
            weakCount: betsData.filter(b => b.signal === "Weak").length,
          });
        }
      }
      setDescendants(result);
    }
    loadDescendants();
  }, [childOrgs]);

  return (
    <div className="mt-8">
      <div className="section-label">Areas — Roll-up</div>

      {loading
        ? <div style={{ fontSize:"0.875rem", color:"var(--t3)", padding:"20px 0" }}>Loading...</div>
        : (
          <>
            {/* All direct children as cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12, marginBottom:16 }}>
              {directCards.map(s => (
                <div key={s.org.id}
                  onClick={() => s.hasChildren ? router.push(`/${s.org.slug}/dashboard`) : undefined}
                  style={{
                    background:"var(--surface)", border:"1px solid var(--border)",
                    borderLeft:`3px solid ${s.org.primary_color || "var(--brand)"}`,
                    borderRadius:"var(--r)", padding:"16px 20px",
                    cursor: s.hasChildren ? "pointer" : "default",
                    transition:"box-shadow 0.15s",
                    opacity: 1,
                  }}
                  onMouseEnter={e => { if (s.hasChildren) e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:600,
                        fontSize:"1rem", color:"var(--text)", letterSpacing:"-0.01em" }}>
                        {s.org.name}
                      </div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", color:"var(--t3)", marginTop:2 }}>
                        {s.activeSprint?.name || "No active sprint"}
                      </div>
                    </div>
                    {s.hasChildren && (
                      <div style={{ fontSize:"0.6875rem", color:"var(--brand)", fontFamily:"var(--font-body)",
                        padding:"2px 6px", borderRadius:"var(--rs)", background:"var(--brand-bg)",
                        border:"1px solid var(--brand-mid)" }}>
                        → open
                      </div>
                    )}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {[
                      { label:"Bets",   value:s.betCount,    color:"var(--text)" },
                      { label:"Strong", value:s.strongCount, color:"var(--scaled)" },
                      { label:"Weak",   value:s.weakCount,   color:"var(--killed)" },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign:"center", padding:"8px 4px",
                        background:"var(--raised)", borderRadius:"var(--rs)" }}>
                        <div style={{ fontFamily:"var(--font-display)", fontWeight:700,
                          fontSize:"1.5rem", color:m.value > 0 ? m.color : "var(--t3)", lineHeight:1 }}>
                          {m.value}
                        </div>
                        <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", color:"var(--t3)", marginTop:2 }}>
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  {s.weakCount > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700,
                        letterSpacing:"0.04em", textTransform:"uppercase", color:"var(--killed)", marginBottom:4 }}>
                        At Risk
                      </div>
                      {s.bets.filter(b => b.signal === "Weak").slice(0,2).map(b => (
                        <div key={b.id} style={{ fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                          color:"var(--t2)", marginBottom:2, whiteSpace:"nowrap",
                          overflow:"hidden", textOverflow:"ellipsis" }}>
                          · {b.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Descendants table — grandchildren and beyond */}
            {descendants.length > 0 && (
              <div style={{
                borderRadius:"var(--r)", overflow:"hidden",
                border:"1px solid var(--border)", marginTop:8,
              }}>
                <div style={{ padding:"8px 16px", borderBottom:"1px solid var(--border)",
                  background:"var(--raised)", fontFamily:"var(--font-body)",
                  fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.06em",
                  textTransform:"uppercase", color:"var(--t3)" }}>
                  Sub-teams
                </div>
                {descendants.map((d, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:16,
                    padding:"10px 16px",
                    borderBottom: i < descendants.length - 1 ? "1px solid var(--border)" : "none",
                    background:"var(--surface)",
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"var(--font-body)", fontWeight:500,
                        fontSize:"0.875rem", color:"var(--text)" }}>
                        {d.name}
                      </div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", color:"var(--t3)" }}>
                        {d.parentName}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:16 }}>
                      {[
                        { label:"Bets",   value:d.betCount },
                        { label:"Strong", value:d.strongCount, color:"var(--scaled)" },
                        { label:"Weak",   value:d.weakCount,   color:"var(--killed)" },
                      ].map(m => (
                        <div key={m.label} style={{ textAlign:"center", minWidth:40 }}>
                          <div style={{ fontFamily:"var(--font-display)", fontWeight:700,
                            fontSize:"1.25rem", color: m.value > 0 && m.color ? m.color : "var(--t2)", lineHeight:1 }}>
                            {m.value}
                          </div>
                          <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", color:"var(--t3)" }}>
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      }
    </div>
  );
}
