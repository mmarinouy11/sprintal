"use client";
import { useStore } from "@/lib/store";
import { sprintProgress, daysRemaining } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

export default function SprintCard({ compact = false }: { compact?: boolean }) {
  const { sprints } = useStore();
  const active = sprints.find(s => s.status === "Active");

  if (!active) return (
    <div className="bg-white border border-gray-100 border-l-2 border-l-[#AADC00] rounded-xl p-4">
      <p className="font-mono text-xs text-gray-300">No active sprint.</p>
    </div>
  );

  const pct = sprintProgress(active.start_date, active.end_date);
  const days = daysRemaining(active.end_date);
  const signals = active.signals?.split("·").map(s => s.trim()).filter(Boolean) || [];

  return (
    <div className="bg-white border border-gray-100 border-l-2 border-l-[#AADC00] rounded-xl px-5 py-4 flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <div className="font-mono font-semibold text-ink">{active.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{active.start_date} → {active.end_date} · {days} days remaining</div>
        <div className="text-sm text-gray-500 mt-2 leading-relaxed">{active.focus}</div>
        {signals.length > 0 && (
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-300 mb-1.5">Success Signals</div>
            {signals.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-500 py-0.5">
                <div className="w-1 h-1 rounded-full bg-[#AADC00] flex-shrink-0" />
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-0.5">
        <StatusBadge status="Active Sprint" />
        <div className="w-28 h-0.5 bg-gray-100 rounded overflow-hidden">
          <div className="h-full bg-[#AADC00] transition-all" style={{width: `${pct}%`}} />
        </div>
        <div className="font-mono text-xs text-[#88B200] font-medium">{pct}% through sprint</div>
      </div>
    </div>
  );
}
