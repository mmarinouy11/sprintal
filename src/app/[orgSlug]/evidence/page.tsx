"use client";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/Badge";

export default function EvidencePage() {
  const { evidence, bets } = useStore();
  return (
    <div className="p-10 max-w-5xl">
      <div className="mb-8 pb-5 border-b border-gray-100">
        <h1 className="font-mono text-2xl font-semibold text-ink">Evidence Log</h1>
        <p className="text-sm text-gray-400 mt-0.5">Signal tracking and decisions</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl border-l-2 border-l-[#AADC00] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Date","Bet","Actual","Insight","New Status"].map(h => (
                <th key={h} className="text-left font-mono text-[10px] uppercase tracking-widest text-gray-300 px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evidence.map(e => {
              const bet = bets.find(b => b.id === e.bet_id);
              return (
                <tr key={e.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-3 font-medium text-ink">{bet?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.actual}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.insight}</td>
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
