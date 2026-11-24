import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import type { Role } from "@allonfire/database/enums";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import type { AppProxy } from "../types/proxy";
import { entersApp } from "./enters-app";
import { hasSectionRole } from "./has-section-role";
import { sessionFromRequest } from "./session-from-request";

/**
 * The visitor's Session, asked of the API: the real check, never the cookie
 * alone, since a cookie the API refuses would bounce between Home and Sign
 * in. `null` when the API cannot say (logged).
 */
const sessionNow = async (request: NextRequest) => {
  try {
    const { data } = await sessionFromRequest(request);
    return data;
  } catch (err) {
    serverLogger().error({ err }, AUTH.LOG_MESSAGE.SESSION_READ_FAILED);
    return null;
  }
};

/** The pages someone the App already lets in is sent Home from. */
const SIGNED_OUT_PAGES = [AUTH.PAGE.SIGN_IN, AUTH.PAGE.FORGOT_PASSWORD];

/**
 * Wraps an App's proxy so a visit with no Session cookie to one of its
 * signed-in `pages` (the App's paths after the locale, `""` for Home), or to
 * any page under one (`/users/<id>`; never under Home, whose root holds
 * every path), goes to Sign in (307) before anything renders: the page's `<Suspense>` would
 * otherwise stream a 200 shell before its `withAppSession` check redirects.
 * Only an optimistic check: the page's own
 * `withAppSession` still decides, so a cookie the API refuses is sent on
 * from there. The other way round, a visit to Sign in or Forgot password by
 * someone the App already lets in goes Home (307), asked of the API
 * (`sessionNow`): only a visit carrying a Session cookie asks, so a
 * signed-out one costs nothing. Reset password always renders: its link may
 * be for an account other than the one signed in.
 * A Section above the App's floor (one that names a `minRole`) or a page
 * under it sends a visitor with a Session cookie whose Role does not
 * reach it Home (307), asked of the API the same way; a path with no
 * `minRole` asks nothing extra, and when the API cannot say the visit goes
 * on to the page's own check.
 * Every other path passes, so an unknown page still 404s.
 */
export const withSignInGate = (
  proxy: AppProxy,
  {
    locales,
    sections,
  }: {
    locales: readonly string[];
    /** The App's Sections, as its descriptor lists them: their paths after the locale (`""` for Home) and each `minRole`. */
    sections: readonly { minRole?: Role | undefined; path: string }[];
  }
): AppProxy => {
  const pages = sections.map(({ path }) => path);
  const gated = sections.flatMap(({ minRole, path }) =>
    minRole ? [{ minRole, path }] : []
  );
  // Each page with and without a language in front (`/`, `/it`), to Sign in
  // in that same form; next-intl picks the language of an unprefixed one.
  const signInFor = new Map<string, string>(
    pages.flatMap((page): [string, string][] => [
      [page || METADATA.PATH.ROOT, AUTH.PAGE.SIGN_IN],
      ...locales.map((locale): [string, string] => [
        `/${locale}${page}`,
        `/${locale}${AUTH.PAGE.SIGN_IN}`,
      ]),
    ])
  );
  // A page's own pages, `/users/` and `/it/users/`, matched as prefixes.
  const signInUnder = [...signInFor].filter(
    ([page]) => page !== METADATA.PATH.ROOT && !locales.includes(page.slice(1))
  );
  // Sign in and Forgot password, in each language form, and the Home they
  // send away to. Never Reset password: its link may be for another account.
  const homeFor = new Map<string, string>(
    SIGNED_OUT_PAGES.flatMap((page): [string, string][] => [
      // Home with no language in front is the root (`AUTH.PAGE.HOME` is `""`).
      [page, METADATA.PATH.ROOT],
      ...locales.map((locale): [string, string] => [
        `/${locale}${page}`,
        `/${locale}${AUTH.PAGE.HOME}`,
      ]),
    ])
  );
  // A gated path, as `/upload` and `/it/upload`, with its Role and the Home
  // (in that language form) a visitor below it is sent to.
  const gatedFor = new Map(
    gated.flatMap(
      ({ minRole, path }): [string, { home: string; minRole: Role }][] => [
        [path, { home: METADATA.PATH.ROOT, minRole }],
        ...locales.map((locale): [string, { home: string; minRole: Role }] => [
          `/${locale}${path}`,
          { home: `/${locale}${AUTH.PAGE.HOME}`, minRole },
        ]),
      ]
    )
  );
  // The gated paths as a list, built once: a page under one is a prefix match,
  // never Home's or a bare language's, which would match every path.
  const gatedUnder = [...gatedFor].filter(
    ([path]) => path !== AUTH.PAGE.HOME && !locales.includes(path.slice(1))
  );
  const gateOf = (pathname: string) =>
    gatedFor.get(pathname) ??
    gatedUnder.find(([path]) => pathname.startsWith(`${path}/`))?.[1];
  const signInOf = (pathname: string) =>
    signInFor.get(pathname) ??
    signInUnder.find(([page]) => pathname.startsWith(`${page}/`))?.[1];
  return async (request) => {
    const { pathname } = request.nextUrl;
    const signedIn = getSessionCookie(request) !== null;
    const home = homeFor.get(pathname);
    if (home && signedIn && entersApp(await sessionNow(request))) {
      return NextResponse.redirect(new URL(home, request.url));
    }
    const signIn = signInOf(pathname);
    if (signIn && !signedIn) {
      return NextResponse.redirect(new URL(signIn, request.url));
    }
    const gate = signedIn ? gateOf(pathname) : undefined;
    if (gate) {
      const session = await sessionNow(request);
      if (session && !hasSectionRole(session, gate.minRole)) {
        return NextResponse.redirect(new URL(gate.home, request.url));
      }
    }
    return proxy(request);
  };
};
