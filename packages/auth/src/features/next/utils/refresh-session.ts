import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { sessionFromRequest } from "./session-from-request";
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
    .some(({ name }) => name.includes(AUTH.COOKIE.SESSION_DATA));
  if (!getSessionCookie(request) || cached) {
    return [];
  }
  let renewed: string[] = [];
  try {
    await sessionFromRequest(request, (response) => {
      renewed = response.headers.getSetCookie();
    });
  } catch (err) {
    serverLogger().error({ err }, AUTH.LOG_MESSAGE.SESSION_REFRESH_FAILED);
    return [];
  }
  return parseSetCookies(renewed);
};
