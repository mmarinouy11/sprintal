import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "pt"] as const,
  defaultLocale: "en" as const,
  localePrefix: "never", // No locale in URL — stored in cookie
});

export type Locale = (typeof routing.locales)[number];
