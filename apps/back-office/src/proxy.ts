import { withSessionRefresh } from "@allonfire/auth/features/next/utils/with-session-refresh";
import { withSignInGate } from "@allonfire/auth/features/next/utils/with-sign-in-gate";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFCreateMiddleware } from "@allonfire/core/features/next/i18n/aof-create-middleware";
import { routing } from "./features/i18n/routing";

// Routes the locale, renews the Session cookies, and sends a signed-out visit
// to a page under `(signed-in)` to Sign in before its loading shell streams.
export default withSessionRefresh(
  withSignInGate(AOFCreateMiddleware(routing), {
    locales: routing.locales,
    pages: [AUTH.PAGE.HOME],
  })
);

export const config = {
  // Pages only: files with a dot, Next internals, the API, and the generated
  // metadata routes of METADATA.PATH (icons, preview images, with or without
  // a locale, hash or image id) skip the proxy, so bots get the file, not a
  // locale redirect or the 404. A literal: Next reads it statically.
  matcher:
    "/((?!api|_next|_vercel|(?:[a-z]{2}/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:-\\w+)?(?:/\\w+)?$|.*\\..*).*)",
};
