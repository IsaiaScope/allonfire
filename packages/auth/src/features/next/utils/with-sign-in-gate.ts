import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import type { AppProxy } from "../types/proxy";
import { entersApp } from "./enters-app";
import { sessionFromRequest } from "./session-from-request";

/**
 * Whether the visitor's Session, asked of the API, is one this App lets in:
 * the real check, never the cookie alone, since a cookie the API refuses
 * would bounce between Home and Sign in. `false` when the API cannot say
 * (logged).
 */
const entersAppNow = async (request: NextRequest) => {
  try {
    const { data } = await sessionFromRequest(request);
    return entersApp(data);
  } catch (err) {
    serverLogger().error({ err }, AUTH.LOG_MESSAGE.SESSION_READ_FAILED);
    return false;
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
 * (`entersAppNow`): only a visit carrying a Session cookie asks, so a
 * signed-out one costs nothing. Reset password always renders: its link may
 * be for an account other than the one signed in.
 * Every other path passes, so an unknown page still 404s.
 */
export const withSignInGate = (
  proxy: AppProxy,
  { locales, pages }: { locales: readonly string[]; pages: readonly string[] }
): AppProxy => {
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
  const signInOf = (pathname: string) =>
    signInFor.get(pathname) ??
    signInUnder.find(([page]) => pathname.startsWith(`${page}/`))?.[1];
  return async (request) => {
    const { pathname } = request.nextUrl;
    const signedIn = getSessionCookie(request) !== null;
    const home = homeFor.get(pathname);
    if (home && signedIn && (await entersAppNow(request))) {
      return NextResponse.redirect(new URL(home, request.url));
    }
    const signIn = signInOf(pathname);
    return signIn && !signedIn
      ? NextResponse.redirect(new URL(signIn, request.url))
      : proxy(request);
  };
};
