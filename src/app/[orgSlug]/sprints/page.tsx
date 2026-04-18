"use client";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/Badge";
import { sprintProgress, daysRemaining } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SprintsPage() {
  const { sprints, bets } = useStore();
  const params = useParams();

  return (
    <div className="w-full px-10 py-8">
      <div className="mb-8 pb-5 border-b border-[var(--border)] flex items-end justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-[var(--text)]">Enterprise Sprints</h1>
          <p className="text-sm text-[var(--t3)] mt-0.5">Time-boxed strategic cycles</p>
        </div>
        <Link href={`/${params.orgSlug}/new/sprint`}
          className="px-4 py-2 bg-[var(--brand)] text-[var(--text)] font-mono text-xs font-semibold rounded hover:bg-[var(--brand-dk)] transition-colors">
          + New Sprint
        </Link>
      </div>
      <div className="space-y-4">
        {sprints.map(s => {
          const sprintBets = bets.filter(b => b.sprint_id === s.id);
          const pct = s.status === "Active" ? sprintProgress(s.start_date, s.end_date) : 0;
          const days = s.status === "Active" ? daysRemaining(s.end_date) : 0;
          return (
            <div key={s.id} className="bg-[var(--surface)] border border-[var(--border)] border-l-[3px] border-l-[var(--brand)] rounded p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono font-semibold text-[var(--text)]">{s.name}</div>
                  <div className="text-xs text-[var(--t3)] mt-0.5">{s.start_date} → {s.end_date}</div>
                </div>
                <StatusBadge status={s.status as any} />
              </div>
              <div className="t-label text-[var(--t3)] mb-1">Strategic Focus</div>
              <div className="text-sm text-[var(--t2)]">{s.focus}</div>
              {s.status === "Active" && (
                <div className="mt-3">
                  <div className="w-full h-0.5 bg-[var(--raised)] rounded overflow-hidden">
                    <div className="h-full bg-[var(--brand)]" style={{width: `${pct}%`}} />
                  </div>
                  <div className="font-mono text-xs text-[var(--brand-dk)] mt-1">{pct}% through sprint</div>
                </div>
              )}
              <div className="flex gap-4 mt-3 text-xs font-mono text-[var(--t3)]">
                <span>{sprintBets.length} bets</span>
                <span>·</span>
                <span>{sprintBets.filter(b => b.status === "Active").length} active</span>
                <span>·</span>
                <span>{sprintBets.filter(b => b.signal === "Strong").length} strong signal</span>
              </div>
              {s.closure && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-4">
                  {[["What worked", s.closure.worked], ["What didn't", s.closure.didnt], ["Surprises", s.closure.surprised]].map(([label, val]) => (
                    <div key={label as string}>
                      <div className="t-label text-[var(--t3)] mb-1">{label}</div>
                      <div className="text-xs text-[var(--t2)]">{val || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
