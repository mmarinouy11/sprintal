"use client";
import { useT } from "@/lib/i18n";
import { Organization } from "@/types";

export default function TrialBanner({ org }: { org: Organization }) {
  if (org.plan !== "trial" || !org.trial_ends_at) return null;

  const trialEnd = new Date(org.trial_ends_at);
  const now = new Date();
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000);

  if (daysLeft <= 0) return null; // Layout already redirects if expired
  if (daysLeft > 14) return null;
  const t = useT("trial"); // Only show when 14 days or less remain

  const isUrgent = daysLeft <= 3;

  return (
    <div style={{
      padding: "8px 24px",
      background: isUrgent ? "rgba(220,38,38,0.06)" : "rgba(234,160,18,0.06)",
      borderBottom: `1px solid ${isUrgent ? "rgba(220,38,38,0.15)" : "rgba(234,160,18,0.15)"}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: "var(--font-body)", fontSize: "0.8125rem",
        color: isUrgent ? "var(--killed)" : "var(--unclear)",
      }}>
        {isUrgent
          ? `⚠ ${t("daysLeft", { days: daysLeft })}`
          : `${t("daysLeft", { days: daysLeft })}`
        }
      </div>
      <a href="mailto:hello@sprintal.com?subject=Activar plan Pro"
        style={{
          fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 600,
          color: isUrgent ? "var(--killed)" : "var(--unclear)",
          textDecoration: "none", whiteSpace: "nowrap",
        }}>
        Activar Pro →
      </a>
    </div>
  );
}
