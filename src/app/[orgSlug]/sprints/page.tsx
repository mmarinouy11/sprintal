"use client";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/Badge";
import { sprintProgress, daysRemaining } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function SprintsPage() {
  const { sprints, bets } = useStore();
  const params = useParams();
  const t = useTranslations();

  return (
    <div className="w-full px-10 py-8">
      <div className="mb-8 pb-5 border-b border-[var(--border)] flex items-end justify-between">
        <div>
          <h1 className="ph-title">Enterprise Sprints</h1>
          <p className="ph-sub">Time-boxed strategic cycles</p>
        </div>
        <Link href={`/${params.orgSlug}/new/sprint`} className="btn-primary">
          + New Sprint
        </Link>
      </div>

      {sprints.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 24px", textAlign: "center",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", borderLeft: "3px solid var(--brand)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🏃</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "1.125rem", color: "var(--text)", marginBottom: 8 }}>
            No sprints yet
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
            color: "var(--t3)", maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
            A sprint defines your strategic focus for a cycle. Create your first sprint to start tracking bets and progress.
          </p>
          <Link href={`/${params.orgSlug}/new/sprint`} className="btn-primary">
            + New Sprint
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sprints.map(s => {
            const sprintBets = bets.filter(b => b.sprint_id === s.id);
            const pct = s.status === "Active" ? sprintProgress(s.start_date, s.end_date) : 0;
            return (
              <div key={s.id} className="bg-[var(--surface)] border border-[var(--border)] rounded p-5"
                style={{ borderLeft: "3px solid var(--brand)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:600,
                      color:"var(--text)", fontSize:"1.0625rem" }}>{s.name}</div>
                    <div className="text-xs mt-0.5" style={{ color:"var(--t3)",
                      fontFamily:"var(--font-mono)" }}>{s.start_date} → {s.end_date}</div>
                  </div>
                  <StatusBadge status={s.status as any} />
                </div>
                {s.focus && (
                  <>
                    <div className="t-label mb-1" style={{ color:"var(--t3)" }}>Strategic Focus</div>
                    <div className="text-sm" style={{ color:"var(--t2)" }}>{s.focus}</div>
                  </>
                )}
                {s.status === "Active" && (
                  <div className="mt-3">
                    <div className="w-full h-0.5 bg-[var(--raised)] rounded overflow-hidden">
                      <div className="h-full bg-[var(--brand)]" style={{width: `${pct}%`}} />
                    </div>
                    <div className="text-xs mt-1" style={{ color:"var(--brand)",
                      fontFamily:"var(--font-body)", fontWeight:500 }}>
                      {pct}% through sprint
                    </div>
                  </div>
                )}
                <div className="flex gap-4 mt-3 text-xs" style={{ color:"var(--t3)",
                  fontFamily:"var(--font-body)" }}>
                  <span>{sprintBets.length} bets</span>
                  <span>·</span>
                  <span>{sprintBets.filter(b => b.status === "Active").length} active</span>
                  <span>·</span>
                  <span>{sprintBets.filter(b => b.signal === "Strong").length} strong signal</span>
                </div>
                {s.closure && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-4">
                    {[["What worked", s.closure.worked], ["What didn't", s.closure.didnt],
                      ["Surprises", s.closure.surprised]].map(([label, val]) => (
                      <div key={label as string}>
                        <div className="t-label mb-1" style={{ color:"var(--t3)" }}>{label}</div>
                        <div className="text-xs" style={{ color:"var(--t2)" }}>{val || "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
