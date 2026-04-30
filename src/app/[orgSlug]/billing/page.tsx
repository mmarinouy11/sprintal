"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatPlanName } from "@/lib/billing";
import type { Plan } from "@/types";

export default function OrgBillingPage() {
  const t = useT("billing");
  const params = useParams<{ orgSlug: string }>();
  const { org, setOrg, setRootPlan } = useStore();
  const [openingPortal, setOpeningPortal] = useState(false);
  /** Same source as API (`billingRoot.plan`); avoids stale zustand `rootPlan` on first paint. */
  const [billingPlan, setBillingPlan] = useState<Plan | null>(null);
  /** Paddle rows live on the billing root (L1), not necessarily on the org for this slug. */
  const [paddleOrgId, setPaddleOrgId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refreshOrgRow() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const slug = params.orgSlug;
      if (!token || !slug || cancelled) return;
      const res = await fetch(
        `/api/org/data?slug=${encodeURIComponent(slug)}&_ts=${Date.now()}`,
        { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok || cancelled) return;
      const data = await res.json().catch(() => null);
      if (!data?.org || cancelled) return;
      const root = data.billingRoot ?? {
        id: data.org.id,
        slug: data.org.slug,
        plan: data.rootPlan ?? data.org.plan,
      };
      const plan = (root.plan ?? data.rootPlan ?? data.org.plan) as Plan;
      setBillingPlan(plan);
      setPaddleOrgId(root.id);
      setOrg(data.org);
      setRootPlan(data.rootPlan || data.org.plan);
    }
    void refreshOrgRow();
    return () => {
      cancelled = true;
    };
  }, [params.orgSlug, setOrg, setRootPlan]);

  if (!org) return null;
  const orgId = paddleOrgId ?? org.id;
  const planLabel = billingPlan ?? (org.plan as Plan);

  async function openPortal() {
    setOpeningPortal(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/paddle/portal?orgId=${encodeURIComponent(orgId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.url) {
        window.open(payload.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOpeningPortal(false);
    }
  }

  const status = org.paddle_subscription_status || "active";
  const statusLabel =
    status === "past_due" ? t("pastDue") : status === "canceled" ? t("canceled") : t("active");

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="ph">
        <div className="ph-title">Billing</div>
        <div className="ph-sub">Manage your subscription and payment details.</div>
      </div>

      <div className="card p-5 mb-4">
        <div className="t-label mb-2">{t("currentPlan")}</div>
        <div className="text-section">{formatPlanName(planLabel)}</div>
      </div>

      <div className="card p-5 mb-4">
        <div className="t-label mb-2">{t("subscriptionStatus")}</div>
        <div className="text-section">{statusLabel}</div>
      </div>

      <div className="card p-5 mb-6">
        <div className="t-label mb-2">{t("nextBilling")}</div>
        <div className="text-small">{org.plan_expires_at ? new Date(org.plan_expires_at).toLocaleDateString() : "-"}</div>
      </div>

      <div className="flex gap-3">
        <button className="btn-primary" type="button" onClick={openPortal} disabled={openingPortal}>
          {t("changePlan")}
        </button>
        <button className="btn-ghost" type="button" onClick={openPortal} disabled={openingPortal}>
          {t("cancelSubscription")}
        </button>
      </div>
    </div>
  );
}
