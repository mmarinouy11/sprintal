import type { Plan } from "@/types";

/** Billing / contract plan for coach limits — prefer root (L1) when present (sub-areas may still store `trial`). */
export function effectiveCoachPlan(rootPlan: string | undefined, orgPlan: Plan | undefined): Plan {
  return (rootPlan || orgPlan || "trial") as Plan;
}
