"use client";

import Modal, { ModalFooter } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n";
import { formatPlanName } from "@/lib/billing";
import type { Plan } from "@/types";

interface UpgradeModalProps {
  requiredPlan: Plan;
  featureName?: string;
  onClose?: () => void;
}

export default function UpgradeModal({ requiredPlan, featureName, onClose }: UpgradeModalProps) {
  const t = useT("billing");

  return (
    <Modal title={t("upgradeTitle")} subtitle={featureName} onClose={onClose}>
      <p className="text-body mb-5">{t("upgradeBody", { plan: formatPlanName(requiredPlan) })}</p>
      <ModalFooter>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => window.open("/pricing", "_blank", "noopener,noreferrer")}
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
