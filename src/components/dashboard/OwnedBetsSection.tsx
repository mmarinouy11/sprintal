"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Bet, Sprint } from "@/types";
import { SignalBadge, AreaTag } from "@/components/ui/Badge";
import BetDetailPanel from "@/components/bets/BetDetailPanel";

/**
 * For sub-orgs — shows all active bets from the parent org.
 * These are the strategic bets this area is responsible for executing against.
 */
export default function OwnedBetsSection() {
  const { org, evidence, signalChecks } = useStore();
  const [ownedBets, setOwnedBets] = useState<Bet[]>([]);
  const [parentSprint, setParentSprint] = useState<Sprint | null>(null);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org?.parent_org_id) { setLoading(false); return; }
    async function load() {
      // Get parent active sprint
      const { data: sprint } = await supabase
        .from("sprints").select("*")
        .eq("org_id", org!.parent_org_id!).eq("status", "Active")
        .maybeSingle();
      setParentSprint(sprint);

      // Get all active bets from parent org
      let query = supabase
        .from("bets").select("*")
        .eq("org_id", org!.parent_org_id!)
        .eq("status", "Active");

      if (sprint) query = query.eq("sprint_id", sprint.id);

      const { data: bets } = await query;
      setOwnedBets(bets || []);
      setLoading(false);
    }
    load();
  }, [org?.parent_org_id]);

  if (!org?.parent_org_id || loading || ownedBets.length === 0) return null;

  return (
    <>
      <div className="mt-8">
        <div className="section-label">
          Bets from Parent Level
          {parentSprint && (
            <span style={{ fontFamily:"var(--font-mono)", fontWeight:400,
              fontSize:"0.75rem", color:"var(--t3)", marginLeft:8 }}>
              {parentSprint.name}
            </span>
          )}
        </div>

        <div style={{
          borderRadius:"var(--r)", overflow:"hidden",
          border:"1px solid var(--border)", borderLeft:"3px solid var(--brand)",
        }}>
          <table className="tbl">
            <thead>
              <tr>
                {["Bet", "Owner", "Signal", "Scale Trigger", "Kill Criteria"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ownedBets.map(b => (
                <tr key={b.id} onClick={() => setSelectedBet(b)} style={{ cursor:"pointer" }}>
                  <td>
                    <div style={{ fontWeight:500, color:"var(--text)" }}>{b.name}</div>
                    {b.outcome && (
                      <div style={{ fontSize:"0.8125rem", color:"var(--t3)", marginTop:2 }}>
                        {b.outcome}
                      </div>
                    )}
                  </td>
                  <td><AreaTag area={b.owner_area} /></td>
                  <td><SignalBadge signal={b.signal} /></td>
                  <td style={{ fontSize:"0.875rem", color:"var(--t3)", maxWidth:200 }}>
                    <span style={{ display:"block", overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {b.scale_trigger || "—"}
                    </span>
                  </td>
                  <td style={{ fontSize:"0.875rem", color:"var(--t3)", maxWidth:200 }}>
                    <span style={{ display:"block", overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {b.kill_criteria || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBet && (
        <BetDetailPanel
          bet={selectedBet}
          evidence={evidence}
          signalChecks={signalChecks}
          sprintName={parentSprint?.name || "—"}
          onClose={() => setSelectedBet(null)}
        />
      )}
    </>
  );
}
