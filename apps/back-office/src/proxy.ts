import { withSessionRefresh } from "@allonfire/auth/features/next/utils/with-session-refresh";
import { AOFCreateMiddleware } from "@allonfire/utils/next/i18n/aof-create-middleware";
import { routing } from "./features/i18n/routing";

// Routes the locale and renews the Session cookies.
export default withSessionRefresh(AOFCreateMiddleware(routing));

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
