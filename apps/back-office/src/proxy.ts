import { withSessionRefresh } from "@allonfire/auth/features/next/utils/with-session-refresh";
import { withSignInGate } from "@allonfire/auth/features/next/utils/with-sign-in-gate";
import { AOFCreateMiddleware } from "@allonfire/core/features/next/i18n/aof-create-middleware";
import { routing } from "./features/i18n/routing";
import { SECTIONS } from "./features/navigation/constants/sections";

// Routes the locale, renews the Session cookies, and sends a signed-out visit
// to a Section to Sign in before anything renders.
export default withSessionRefresh(
  withSignInGate(AOFCreateMiddleware(routing), {
    locales: routing.locales,
    pages: SECTIONS.map(({ path }) => path),
  })
);

export const config = {
  // Pages only: files with a dot, Next internals, the API, and the generated
  // metadata routes of METADATA.PATH (icons, preview images, with or without
  // a locale, hash or image id) skip the proxy, so bots get the file, not a
  // locale redirect or the 404; so does each language's Offline page, which
  // the service worker precaches at its prefixed address. A literal: Next reads it statically.
  matcher:
    "/((?!api|_next|_vercel|(?:[a-z]{2}/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:-\\w+)?(?:/\\w+)?$|[a-z]{2}/offline$|.*\\..*).*)",
};
