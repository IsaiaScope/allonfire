import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import type { AppPath } from "../constants/paths";

type Proxy = (request: NextRequest) => Promise<Response> | Response;

/**
 * Wraps an App's proxy so a visit with no Session cookie to one of its
 * signed-in `pages` goes to Sign in (307) before anything renders: a page
 * under a `loading.tsx` would otherwise stream a 200 shell before its
 * `requireAppSession` redirects. Only an optimistic check: the page's own
 * `requireAppSession` still decides, so a cookie the API refuses is sent on
 * from there. Every other path passes, so an unknown page still 404s.
 */
export const withSignInGate = (
  proxy: Proxy,
  { locales, pages }: { locales: readonly string[]; pages: readonly AppPath[] }
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
  return (request) => {
    const signIn = signInFor.get(request.nextUrl.pathname);
    return signIn && !getSessionCookie(request)
      ? NextResponse.redirect(new URL(signIn, request.url))
      : proxy(request);
  };
};
