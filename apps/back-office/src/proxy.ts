import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./features/i18n/routing";

// Locale only. Sign-in checks arrive with the auth plan (ADR 0009).
export default createIntlMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
