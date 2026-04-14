"use client";
import { useStore } from "@/lib/store";
import { StatusBadge, SignalBadge, AreaTag } from "@/components/ui/Badge";
import { STATUS_COLORS } from "@/lib/utils";
import type { BetStatus } from "@/types";

const COLS: BetStatus[] = ["Active","Scaled","Pivoted","Done","Killed"];

export default function BetsBoardPage() {
  const { bets, sprints } = useStore();
  return (
    <div className="p-10">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Strategic Bets — Board</h1>
        <p className="text-sm text-gray-400 mt-0.5">Grouped by status · Click any bet to expand</p>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {COLS.map(col => {
          const cb = bets.filter(b => b.status === col);
          return (
            <div key={col} className="bg-white border border-gray-100 rounded-xl p-3 min-h-48"
              style={{borderLeft: `2px solid ${STATUS_COLORS[col]}`}}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-400">{col}</span>
                <span className="bg-gray-100 text-gray-400 font-mono text-xs px-1.5 py-0.5 rounded">{cb.length}</span>
              </div>
              {cb.map(b => (
                <div key={b.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 mb-2 cursor-pointer hover:border-[#AADC00] transition-colors">
                  <div className="font-medium text-sm text-ink mb-1">
                    {b.name}
                    {b.is_draft && <span className="ml-2 font-mono text-[10px] text-purple-400 font-semibold">DRAFT</span>}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mb-2">
                    {sprints.find(s => s.id === b.sprint_id)?.name || "—"}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SignalBadge signal={b.signal} />
                    <AreaTag area={b.owner_area} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
