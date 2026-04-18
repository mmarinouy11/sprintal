"use client";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/Badge";

export default function EvidencePage() {
  const { evidence, bets } = useStore();
  return (
    <div className="w-full px-10 py-8">
      <div className="mb-8 pb-5 border-b border-[var(--border)]">
        <h1 className="font-mono text-2xl font-semibold text-[var(--text)]">Evidence Log</h1>
        <p className="text-sm text-[var(--t3)] mt-0.5">Signal tracking and decisions</p>
      </div>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded border-l-[3px] border-l-[var(--brand)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--raised)] border-b border-[var(--border)]">
              {["Date","Bet","Actual","Insight","New Status"].map(h => (
                <th key={h} className="text-left font-mono text-[10px] tracking-wide text-[var(--t3)] px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evidence.map(e => {
              const bet = bets.find(b => b.id === e.bet_id);
              return (
                <tr key={e.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--t3)] whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{bet?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-[var(--t2)]">{e.actual}</td>
                  <td className="px-4 py-3 text-sm text-[var(--t2)]">{e.insight}</td>
                  <td className="px-4 py-3">{e.new_status && <StatusBadge status={e.new_status as any} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
