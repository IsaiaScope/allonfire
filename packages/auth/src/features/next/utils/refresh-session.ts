import { visitorHeaders } from "@allonfire/utils/next/api/forwarded-for";
import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "../constants/api";
import { createApiAuthClient } from "./auth-client";
import { type ParsedCookie, parseSetCookies } from "./set-cookie";

/**
 * The Session cookies the API renews, for the App's proxy to set before the
 * page reads them: a page cannot set cookies, so a renewal it received would
 * be lost. Asks only when signed in and the cookie cache has expired, about
 * once every five minutes: the API then reads the database, sends a fresh
 * cache and, once a day, extends the Session itself. An ended Session comes
 * back as cookies that clear it.
 */
export const refreshSession = async (
  request: NextRequest
): Promise<ParsedCookie[]> => {
  // `includes`: Better Auth splits a large cache into `.0`, `.1` chunks.
  const cached = request.cookies
    .getAll()
    .some(({ name }) => name.includes(AUTH_COOKIE.SESSION_DATA));
  if (!getSessionCookie(request) || cached) {
    return [];
  }
  let renewed: string[] = [];
  try {
    await createApiAuthClient().getSession({
      fetchOptions: {
        headers: visitorHeaders(request.cookies.toString(), request.headers),
        onResponse: ({ response }) => {
          renewed = response.headers.getSetCookie();
        },
      },
    });
  } catch {
    return [];
  }
  return parseSetCookies(renewed);
};
