/**
 * Persists a paid-plan checkout intent across signup → onboarding → dashboard.
 *
 * The plan chosen on /pricing while logged out must survive the whole auth flow
 * (multiple full-page navigations + OAuth round-trips) so we can auto-open the
 * Paddle checkout once onboarding completes. localStorage is the only store that
 * survives all of those hops reliably.
 */
import type { Plan } from "@/types";

export type PaidPlan = Exclude<Plan, "trial">;
export type BillingPeriod = "monthly" | "annual";

const STORAGE_KEY = "sprintal:pendingPlan";

const PAID_PLANS: readonly PaidPlan[] = ["solo", "starter", "growth", "scale"];
const PERIODS: readonly BillingPeriod[] = ["monthly", "annual"];

export function isPaidPlan(value: string | null | undefined): value is PaidPlan {
  return !!value && (PAID_PLANS as readonly string[]).includes(value);
}

export function isBillingPeriod(value: string | null | undefined): value is BillingPeriod {
  return !!value && (PERIODS as readonly string[]).includes(value);
}

export interface PendingPlan {
  plan: PaidPlan;
  period: BillingPeriod;
}

/** No-op when `plan` is null / "free" / "trial" / otherwise not a paid plan. */
export function savePendingPlan(
  plan: string | null | undefined,
  period: string | null | undefined
): void {
  if (typeof window === "undefined") return;
  if (!isPaidPlan(plan)) return;
  const normalizedPeriod: BillingPeriod = isBillingPeriod(period) ? period : "monthly";
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ plan, period: normalizedPeriod } satisfies PendingPlan)
    );
  } catch {
    // Private mode / storage disabled — checkout auto-open just won't happen.
  }
}

export function readPendingPlan(): PendingPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { plan?: string; period?: string };
    if (!isPaidPlan(parsed.plan)) return null;
    return {
      plan: parsed.plan,
      period: isBillingPeriod(parsed.period) ? parsed.period : "monthly",
    };
  } catch {
    return null;
  }
}

export function clearPendingPlan(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
