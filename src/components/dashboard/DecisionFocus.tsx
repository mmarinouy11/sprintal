"use client";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/Badge";

export default function DecisionFocus() {
  const { bets, sprints } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const ab = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");

  const cols = [
    { label: "Candidates to Scale", color: "#00C864", items: ab.filter(b => b.signal === "Strong") },
    { label: "At Risk — Unclear Signal", color: "#EAA012", items: ab.filter(b => b.signal === "Unclear") },
    { label: "Candidates to Kill", color: "#E63232", items: ab.filter(b => b.signal === "Weak") },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cols.map(col => (
        <div key={col.label} className="bg-white border border-gray-100 rounded-xl p-4"
          style={{borderLeft: `2px solid ${col.color}`}}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{background: col.color}} />
            <span className="font-mono text-xs font-semibold text-gray-500">{col.label}</span>
          </div>
          {col.items.length === 0
            ? <p className="text-xs text-gray-300 font-mono">None</p>
            : col.items.map(b => (
              <div key={b.id} className="bg-gray-50 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="font-medium text-sm text-ink">{b.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {col.color === "#00C864" ? b.scale_trigger : b.kill_criteria}
                </div>
              </div>
            ))
          }
        </div>
      ))}
    </div>
  );
}
