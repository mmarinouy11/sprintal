"use client";
import { useStore } from "@/lib/store";
import { StatusBadge, SignalBadge, AreaTag } from "@/components/ui/Badge";

export default function ActiveBetsTable() {
  const { bets, sprints } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const ab = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");

  return (
    <div className="bg-white border border-gray-100 rounded-xl border-l-2 border-l-[#AADC00] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {["Bet","Owner","Status","Signal","Last Reviewed"].map(h => (
              <th key={h} className="text-left font-mono text-[10px] uppercase tracking-widest text-gray-300 px-4 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ab.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-4 text-sm text-gray-300 font-mono">No active bets.</td></tr>
          ) : ab.map(b => (
            <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
              <td className="px-4 py-3"><AreaTag area={b.owner_area} /> <span className="text-xs text-gray-400 ml-1">{b.owner_contact}</span></td>
              <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              <td className="px-4 py-3"><SignalBadge signal={b.signal} /></td>
              <td className="px-4 py-3 font-mono text-xs text-gray-400">{b.last_reviewed || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
