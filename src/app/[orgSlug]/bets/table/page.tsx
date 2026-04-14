"use client";
import { useStore } from "@/lib/store";
import { StatusBadge, SignalBadge, AreaTag } from "@/components/ui/Badge";
import { BetStatus } from "@/types";
import { AREAS } from "@/lib/utils";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";

const STATUSES: BetStatus[] = ["Active","Scaled","Pivoted","Done","Killed"];
const SIGNALS = ["Strong","Unclear","Weak"];

export default function BetsTablePage() {
  const { bets, sprints } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const [statusF, setStatusF] = useState<string | null>(searchParams.get("status"));
  const [signalF, setSignalF] = useState<string | null>(null);
  const [ownerF, setOwnerF] = useState<string | null>(null);

  useEffect(() => { setStatusF(searchParams.get("status")); }, [searchParams]);

  let filtered = bets;
  if (statusF) filtered = filtered.filter(b => b.status === statusF);
  if (signalF) filtered = filtered.filter(b => b.signal === signalF);
  if (ownerF) filtered = filtered.filter(b => b.owner_area === ownerF);

  function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button onClick={onClick}
        className={`px-3 py-1 rounded-full font-mono text-xs font-medium border transition-colors ${
          active ? "bg-[#AADC00] text-ink border-[#AADC00]" : "bg-transparent text-gray-400 border-gray-200 hover:border-gray-400"
        }`}>
        {label}
      </button>
    );
  }

  return (
    <div className="p-10">
      <div className="mb-6 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Strategic Bets — Full Table</h1>
        <p className="text-sm text-gray-400 mt-0.5">All bets · Click any row to expand</p>
      </div>
      {/* Filters */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-300 w-12">Status</span>
          <Pill label="All" active={!statusF} onClick={() => setStatusF(null)} />
          {STATUSES.map(s => <Pill key={s} label={s} active={statusF === s} onClick={() => setStatusF(s)} />)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-300 w-12">Signal</span>
          <Pill label="All" active={!signalF} onClick={() => setSignalF(null)} />
          {SIGNALS.map(s => <Pill key={s} label={s} active={signalF === s} onClick={() => setSignalF(s)} />)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-300 w-12">Owner</span>
          <Pill label="All" active={!ownerF} onClick={() => setOwnerF(null)} />
          {AREAS.map(a => <Pill key={a} label={a} active={ownerF === a} onClick={() => setOwnerF(a)} />)}
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl border-l-2 border-l-[#AADC00] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Name","Sprint","Owner Area","Contact","Status","Signal","Impact","Alignment"].map(h => (
                <th key={h} className="text-left font-mono text-[10px] uppercase tracking-widest text-gray-300 px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 font-mono text-xs text-gray-300">No bets match the current filters.</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-ink">
                  {b.name}
                  {b.is_draft && <span className="ml-2 font-mono text-[10px] text-purple-400">DRAFT</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{sprints.find(s => s.id === b.sprint_id)?.name || "—"}</td>
                <td className="px-4 py-3"><AreaTag area={b.owner_area} /></td>
                <td className="px-4 py-3 text-sm text-gray-400">{b.owner_contact}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3"><SignalBadge signal={b.signal} /></td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-400">Rev: {b.revenue}</div>
                  <div className="text-xs text-gray-400">Marg: {b.margin}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {(b.alignment || []).map(a => <AreaTag key={a} area={a} />)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
