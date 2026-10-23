import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { visitorHeaders } from "@allonfire/core/features/next/api/forwarded-for";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { createApiAuthClient } from "./auth-client";
import { entersApp } from "./enters-app";

type Proxy = (request: NextRequest) => Promise<Response> | Response;

/**
 * Whether the visitor's Session, asked of the API, is one this App lets in:
 * the real check, never the cookie alone, since a cookie the API refuses
 * would bounce between Home and Sign in. `false` when the API cannot say.
 */
const entersAppNow = async (request: NextRequest) => {
  try {
    const { data } = await createApiAuthClient().getSession({
      fetchOptions: {
        headers: visitorHeaders(request.cookies.toString(), request.headers),
      },
    });
    return entersApp(data);
  } catch {
    return false;
  }
};

/**
 * Wraps an App's proxy so a visit with no Session cookie to one of its
 * signed-in `pages` (the App's paths after the locale, `""` for Home), or to
 * any page under one (`/users/<id>`; never under Home, whose root holds
 * every path), goes to Sign in (307) before anything renders: the page's `<Suspense>` would
 * otherwise stream a 200 shell before its `withAppSession` check redirects.
 * Only an optimistic check: the page's own
 * `withAppSession` still decides, so a cookie the API refuses is sent on
 * from there. The other way round, a visit to Sign in by someone the App
 * already lets in goes Home (307), asked of the API (`entersAppNow`): only
 * a visit carrying a Session cookie asks, so a signed-out one costs nothing.
 * Every other path passes, so an unknown page still 404s.
 */
export const withSignInGate = (
  proxy: Proxy,
  { locales, pages }: { locales: readonly string[]; pages: readonly string[] }
): Proxy => {
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
  // Sign in, in each language form, and the Home it sends away to.
  const homeFor = new Map<string, string>([
    // Home with no language in front is the root (`AUTH.PAGE.HOME` is `""`).
    [AUTH.PAGE.SIGN_IN, METADATA.PATH.ROOT],
    ...locales.map((locale): [string, string] => [
      `/${locale}${AUTH.PAGE.SIGN_IN}`,
      `/${locale}${AUTH.PAGE.HOME}`,
    ]),
  ]);
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
