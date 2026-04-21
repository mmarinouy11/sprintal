"use client";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { StatusBadge, SignalBadge, AreaTag } from "@/components/ui/Badge";
import type { BetStatus, Bet } from "@/types";
import { useSearchParams, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import BetDetailPanel from "@/components/bets/BetDetailPanel";

const STATUSES: BetStatus[] = ["Active","Scaled","Pivoted","Done","Killed"];
const SIGNALS = ["Strong","Unclear","Weak"];

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`fpill ${active ? "active" : ""}`}>{label}</button>
  );
}

export default function BetsTablePage() {
  const { bets, sprints, evidence, signalChecks, childOrgs } = useStore();
  const t = useT();
  const searchParams = useSearchParams();
  const params = useParams();
  const [statusF, setStatusF] = useState<string | null>(searchParams.get("status"));
  const [signalF, setSignalF] = useState<string | null>(null);
  const [ownerF, setOwnerF] = useState<string | null>(searchParams.get("area"));
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

  useEffect(() => {
    setStatusF(searchParams.get("status"));
    setOwnerF(searchParams.get("area"));
  }, [searchParams]);

  let filtered = bets;
  if (statusF) filtered = filtered.filter(b => b.status === statusF);
  if (signalF) filtered = filtered.filter(b => b.signal === signalF);
  if (ownerF) filtered = filtered.filter(b => b.owner_area === ownerF);

  // Areas for filter — use org areas if available, else derive from bets
  const filterAreas = childOrgs.length > 0
    ? childOrgs.map(a => a.name)
    : Array.from(new Set(bets.map(b => b.owner_area).filter(Boolean) as string[]));

  return (
    <div className="w-full px-10 py-8">
      <div className="ph">
        <div className="ph-title">{t("nav.betsTable")}</div>
        <div className="ph-sub">{t("nav.betsTableSub")}</div>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="t-label w-14">Status</span>
          <Pill label="All" active={!statusF} onClick={() => setStatusF(null)} />
          {STATUSES.map(s => <Pill key={s} label={s} active={statusF === s} onClick={() => setStatusF(s)} />)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="t-label w-14">Signal</span>
          <Pill label="All" active={!signalF} onClick={() => setSignalF(null)} />
          {SIGNALS.map(s => <Pill key={s} label={s} active={signalF === s} onClick={() => setSignalF(s)} />)}
        </div>
        {filterAreas.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-label w-14">Area</span>
            <Pill label="All" active={!ownerF} onClick={() => setOwnerF(null)} />
            {filterAreas.map(a => <Pill key={a} label={a} active={ownerF === a} onClick={() => setOwnerF(a)} />)}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--brand)" }}>
        <table className="tbl">
          <thead>
            <tr>
              {["Name","Sprint","Owner","Status","Signal","Impact","Last Reviewed"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7} className="t-mono" style={{ color: "var(--t2)" }}>No bets match the current filters.</td></tr>
              : filtered.map(b => {
                  const incomplete = !b.kill_criteria || !b.scale_trigger || !b.hypothesis;
                  return (
                    <tr key={b.id} onClick={() => setSelectedBet(b)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm" style={{ color: "var(--text)" }}>
                            {b.name}
                            {b.is_draft && <span className="ml-1 t-mono" style={{ fontSize: "0.6rem", color: "var(--pivoted)" }}>DRAFT</span>}
                          </div>
                          {incomplete && (
                            <span title="Incomplete bet — missing fields"
                              className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: "rgba(234,160,18,0.15)", color: "var(--unclear)", fontSize: "0.6rem" }}>
                              !
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="t-mono" style={{ color: "var(--t2)" }}>{sprints.find(s => s.id === b.sprint_id)?.name || "—"}</td>
                      <td><div className="flex items-center gap-1.5"><AreaTag area={b.owner_area} /><span className="t-mono" style={{ color: "var(--t2)" }}>{b.owner_contact}</span></div></td>
                      <td><StatusBadge status={b.status} /></td>
                      <td><SignalBadge signal={b.signal} /></td>
                      <td>
                        <div className="t-mono text-xs" style={{ color: "var(--t2)" }}>R:{b.revenue} M:{b.margin}</div>
                      </td>
                      <td className="t-mono" style={{ color: "var(--t2)" }}>{b.last_reviewed || "—"}</td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {selectedBet && (
        <BetDetailPanel
          bet={selectedBet}
          evidence={evidence}
          signalChecks={signalChecks}
          sprintName={sprints.find(s => s.id === selectedBet.sprint_id)?.name || "—"}
          onClose={() => setSelectedBet(null)}
        />
      )}
    </div>
  );
}
