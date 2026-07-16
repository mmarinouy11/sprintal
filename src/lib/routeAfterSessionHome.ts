import { isBillingPeriod, isPaidPlan, readPendingPlan } from "@/lib/pendingPlan";

export type SessionHomeRouteTarget = {
  slug: string;
  onboarding_complete: boolean;
};

/**
 * Shared post-auth routing: onboarding → pricing (URL plan or pendingPlan) → dashboard.
 * Used by OAuth callback success, retry, and signup alreadyMember branches.
 */
export function pathAfterSessionHome(
  home: SessionHomeRouteTarget,
  urlPlan?: string | null,
  urlPeriod?: string | null
): string {
  if (!home.onboarding_complete) {
    return `/onboarding/${home.slug}`;
  }

  const pending = readPendingPlan();
  const plan =
    (isPaidPlan(urlPlan) ? urlPlan : null) ??
    pending?.plan ??
    null;
  const period =
    (isBillingPeriod(urlPeriod) ? urlPeriod : null) ??
    pending?.period ??
    "monthly";

  if (plan) {
    const qs = new URLSearchParams();
    qs.set("plan", plan);
    qs.set("period", period);
    qs.set("orgSlug", home.slug);
    return `/pricing?${qs.toString()}`;
  }

  return `/${home.slug}/dashboard`;
}
