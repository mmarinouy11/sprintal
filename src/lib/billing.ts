import type { Plan } from "@/types";

type PlanPeriod = "monthly" | "annual";

export const PRICE_TO_PLAN: Record<string, { plan: Plan; period: PlanPeriod }> = {
  [process.env.PADDLE_PRICE_SOLO_MONTHLY!]: { plan: "solo", period: "monthly" },
  [process.env.PADDLE_PRICE_SOLO_ANNUAL!]: { plan: "solo", period: "annual" },
  [process.env.PADDLE_PRICE_STARTER_MONTHLY!]: { plan: "starter", period: "monthly" },
  [process.env.PADDLE_PRICE_STARTER_ANNUAL!]: { plan: "starter", period: "annual" },
  [process.env.PADDLE_PRICE_GROWTH_MONTHLY!]: { plan: "growth", period: "monthly" },
  [process.env.PADDLE_PRICE_GROWTH_ANNUAL!]: { plan: "growth", period: "annual" },
  [process.env.PADDLE_PRICE_SCALE_MONTHLY!]: { plan: "scale", period: "monthly" },
  [process.env.PADDLE_PRICE_SCALE_ANNUAL!]: { plan: "scale", period: "annual" },
};

export function getPlanFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  return PRICE_TO_PLAN[priceId]?.plan ?? null;
}

export function getPeriodFromPriceId(priceId: string | null | undefined): PlanPeriod | null {
  if (!priceId) return null;
  return PRICE_TO_PLAN[priceId]?.period ?? null;
}

export function formatPlanName(plan: Plan | null | undefined): string {
  if (plan === "solo") return "Solo";
  if (plan === "starter") return "Starter";
  if (plan === "growth") return "Growth";
  if (plan === "scale") return "Scale";
  return "Trial";
}
