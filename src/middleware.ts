// i18n middleware — Phase 2 will activate this
// For now locale is detected client-side from browser/cookie
export { default } from "next-intl/middleware";
import { routing } from "./i18n/routing";

export const config = {
  // Disabled — no routes matched
  matcher: [],
};
