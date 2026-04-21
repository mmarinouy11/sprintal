import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Only run on non-API, non-static routes
  matcher: [
    "/((?!api|_next|_vercel|auth|.*\\..*).*)",
  ],
};
