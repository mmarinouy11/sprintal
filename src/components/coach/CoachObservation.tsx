"use client";

interface CoachObservationProps {
  observation: string | null;
  loading: boolean;
  limitReached?: boolean;
  upgradeRequired?: boolean;
}

export default function CoachObservation({ observation, loading, limitReached, upgradeRequired }: CoachObservationProps) {
  if (!loading && !observation && !limitReached) return null;

  if (limitReached) {
    return (
      <div style={{
        marginTop: 6,
        padding: "6px 12px",
        borderRadius: "var(--rs)",
        background: "rgba(234,160,18,0.06)",
        border: "1px solid rgba(234,160,18,0.18)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontSize: "0.75rem", color: "var(--unclear)" }}>⚠</span>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "var(--unclear)", margin: 0 }}>
          {upgradeRequired
            ? "Coach not available on this plan. Upgrade to unlock."
            : "Monthly coach limit reached. Resets next month."}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 6,
      padding: "8px 12px",
      borderRadius: "var(--rs)",
      background: "rgba(92,106,196,0.06)",
      border: "1px solid rgba(92,106,196,0.18)",
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
    }}>
      <span style={{ fontSize: "0.75rem", flexShrink: 0, marginTop: 1, color: "var(--brand)", opacity: loading ? 0.4 : 1 }}>
        ✦
      </span>
      {loading ? (
        <div style={{ display: "flex", gap: 3, alignItems: "center", paddingTop: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "var(--brand)",
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      ) : (
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--brand)",
          lineHeight: 1.55,
          margin: 0,
        }}>
          {observation}
        </p>
      )}
    </div>
  );
}
