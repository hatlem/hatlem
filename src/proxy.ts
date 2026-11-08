import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (Next.js internals)
    // - Static files with extensions
    // - /bursdag (egen app, videresendes i next.config.ts)
    "/((?!api|_next|bursdag|.*\\..*).*)",
  ],
};
