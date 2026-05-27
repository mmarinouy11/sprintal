/** Inline SVG icons for collapsed sidebar (18×18). */

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconBrandS() {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "1.125rem",
        color: "var(--brand)",
        lineHeight: 1,
      }}
    >
      S
    </span>
  );
}

export function IconDashboard() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconSprints() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconBets() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
    </svg>
  );
}

export function IconBetsTable() {
  return (
    <svg {...iconProps}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconEvidence() {
  return (
    <svg {...iconProps}>
      <path d="M8 4h8l2 4v12H6V8l2-4z" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconNewSprint() {
  return (
    <svg {...iconProps}>
      <path d="M12 5v14M5 12h14" />
      <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
    </svg>
  );
}

export function IconNewBet() {
  return (
    <svg {...iconProps}>
      <path d="M12 5v14M5 12h14" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function IconSignal() {
  return (
    <svg {...iconProps}>
      <path d="M4 14c2-4 4-6 8-6s6 2 8 6" />
      <path d="M6 18c2-3 4-4 6-4s4 1 6 4" />
    </svg>
  );
}

export function IconReview() {
  return (
    <svg {...iconProps}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l3-4 3 3 4-6" />
    </svg>
  );
}

export function IconCloseSprint() {
  return (
    <svg {...iconProps}>
      <path d="M5 12l4 4L19 6" />
      <path d="M4 4h16v16H4z" strokeDasharray="0" opacity="0" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconBilling() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function IconSignOut() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
