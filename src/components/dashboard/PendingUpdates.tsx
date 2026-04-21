"use client";
import { useStore } from "@/lib/store";
import { differenceInDays, parseISO } from "date-fns";
import { AreaTag, SignalBadge, StatusBadge } from "@/components/ui/Badge";
import { getCadenceConfig, getSprintDuration } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function PendingUpdates({ type }: { type: "review" | "signal" }) {
  const { bets, sprints, evidence, signalChecks } = useStore();
  const t = useT("dashboard");
  const active = sprints.find(s => s.status === "Active");
  const activeBets = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");
  const now = new Date();

  // Parametric cadence based on sprint duration
  const duration = active ? getSprintDuration(active.start_date, active.end_date) : 90;
  const cadence = getCadenceConfig(duration);
  const threshold = type === "review" ? cadence.reviewInterval : cadence.signalInterval;
  const overdueThreshold = type === "review" ? cadence.reviewOverdueAt : cadence.signalOverdueAt;

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

  const label = type === "review" ? t("strategicReviews") : t("signalChecks");

  if (!items.length) return (
    <p className="text-small" style={{ color: "var(--scaled)" }}>
      ✓ {t("allUpToDate", { label })}
    </p>
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ b, lastDate, days }) => {
        const isNever = days === null;
        const isOverdue = isNever || (days !== null && days > overdueThreshold);
        const borderColor = isOverdue ? "var(--killed)" : "var(--unclear)";
        return (
          <div key={b.id} className="rounded p-4 cursor-pointer transition-colors"
            style={{ background: "var(--surface)", border: `1px solid var(--border)`, borderLeft: `2px solid ${borderColor}` }}>
            <div className="font-medium text-sm mb-2" style={{ color: "var(--text)" }}>{b.name}</div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <AreaTag area={b.owner_area} />
              <span className="t-mono" style={{ color: "var(--t2)" }}>{b.owner_contact}</span>
            </div>
            {type === "review"
              ? <StatusBadge status={b.status} />
              : <SignalBadge signal={b.signal} />}
            <div className="t-mono mt-2 font-medium"
              style={{ color: isOverdue ? "var(--killed)" : "var(--unclear)" }}>
              {isNever
                ? t("neverReviewed", { days: threshold })
                : t("lastReviewed", { date: lastDate!, days: days!, interval: threshold })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
