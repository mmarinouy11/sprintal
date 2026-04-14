"use client";
import { Organization } from "@/types";
import { isTrialExpiring, isTrialExpired, daysRemaining } from "@/lib/utils";
import Link from "next/link";

export default function TrialBanner({ org }: { org: Organization }) {
  if (org.plan !== "trial") return null;
  const expired = isTrialExpired(org.trial_ends_at);
  const expiring = isTrialExpiring(org.trial_ends_at);
  if (!expiring && !expired) return null;

  const days = daysRemaining(org.trial_ends_at);

  return (
    <div className={`px-6 py-2 text-xs font-mono flex items-center justify-between ${
      expired ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
    }`}>
      <span>
        {expired
          ? "Your trial has expired. Upgrade to continue."
          : `${days} days left in your trial.`}
      </span>
      <Link href={`/settings/billing`}
        className="font-semibold underline underline-offset-2 hover:no-underline">
        Upgrade →
      </Link>
    </div>
  );
}
