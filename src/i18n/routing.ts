// Placeholder — routing handled by Next.js App Router directly
export const routing = {
  locales: ["en", "es", "pt"] as const,
  defaultLocale: "en" as const,
};

export type Locale = typeof routing.locales[number];
