"use client";
import { useStore } from "@/lib/store";
import { differenceInDays, parseISO } from "date-fns";
import { StatusBadge, AreaTag, SignalBadge } from "@/components/ui/Badge";

export default function PendingUpdates({ type }: { type: "review" | "signal" }) {
  const { bets, sprints, evidence, signalChecks } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const activeBets = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const now = new Date();
  const threshold = type === "review" ? 30 : 14;
  const overdueThreshold = type === "review" ? 60 : 21;

  const items = activeBets.map(b => {
    const entries = type === "review"
      ? evidence.filter(e => e.bet_id === b.id)
      : signalChecks.filter(s => s.bet_id === b.id);
    entries.sort((a, z) => new Date(z.created_at).getTime() - new Date(a.created_at).getTime());
    const last = entries[0];
    const lastDate = last?.date || null;
    const days = lastDate ? differenceInDays(now, parseISO(lastDate)) : null;
    return { b, lastDate, days };
  }).filter(({ days }) => days === null || days > threshold)
    .sort((a, z) => (z.days || 999) - (a.days || 999));

  if (!items.length) return (
    <p className="font-mono text-xs text-[#88B200]">All {type === "review" ? "reviews" : "signals"} up to date.</p>
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ b, lastDate, days }) => {
        const isNever = days === null;
        const isOverdue = isNever || (days !== null && days > overdueThreshold);
        return (
          <div key={b.id} className={`bg-white border rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            isOverdue ? "border-l-2 border-l-red-400 border-gray-100" : "border-l-2 border-l-amber-400 border-gray-100"
          }`}>
            <div className="font-medium text-sm text-ink mb-1">{b.name}</div>
            <div className="flex items-center gap-2 mb-2">
              <AreaTag area={b.owner_area} />
              <span className="text-xs text-gray-400">{b.owner_contact}</span>
            </div>
            {type === "review" ? <StatusBadge status={b.status} /> : <SignalBadge signal={b.signal} />}
            <div className={`font-mono text-xs mt-2 font-semibold ${isOverdue ? "text-red-400" : "text-amber-500"}`}>
              {isNever ? "Never reviewed" : `Last: ${lastDate} · ${days}d ago`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
