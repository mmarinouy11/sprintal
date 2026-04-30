"use client";

import Modal, { ModalFooter } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n";
import { formatPlanName } from "@/lib/billing";
import type { Plan } from "@/types";

interface UpgradeModalProps {
  requiredPlan: Plan;
  featureName?: string;
  onClose?: () => void;
  /** Current app org slug so /pricing shows the same plan + sends the correct Paddle org id */
  orgSlug?: string | null;
}

export default function UpgradeModal({ requiredPlan, featureName, onClose, orgSlug }: UpgradeModalProps) {
  const t = useT("billing");
  const pricingHref = orgSlug?.trim()
    ? `/pricing?org=${encodeURIComponent(orgSlug.trim())}`
    : "/pricing";

  return (
    <Modal title={t("upgradeTitle")} subtitle={featureName} onClose={onClose}>
      <p className="text-body mb-5">{t("upgradeBody", { plan: formatPlanName(requiredPlan) })}</p>
      <ModalFooter>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => window.open(pricingHref, "_blank", "noopener,noreferrer")}
        >
          {t("viewPricing")}
        </button>
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>
          {t("maybeLater")}
        </button>
      </ModalFooter>
    </Modal>
  );
}
