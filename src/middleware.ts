import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except:
    // - API routes
    // - Static files (_next, public)
    // - Auth callback (Supabase handles redirect)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
