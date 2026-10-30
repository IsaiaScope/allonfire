import { readVisitorHeaders } from "@allonfire/core/features/next/api/forwarded-for";
import { getSessionCookie } from "better-auth/cookies";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { AUTH } from "../../../shared/constants/auth";
import { createApiAuthClient, type Session } from "./auth-client";
import { entersApp } from "./enters-app";
import { redirectTo } from "./redirect-to";

/**
 * The visitor's Session, read from the API with the browser's cookies; `null`
 * when signed out or the API cannot say. The App's proxy has already renewed
 * the cookies (`refreshSession`), so a renewal the API sends here is a repeat.
 * Read once per request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // Any other cookie (the language one) is no reason to ask the API.
  if (!getSessionCookie(await headers())) {
    return null;
  }
  try {
    const { data } = await createApiAuthClient().getSession({
      fetchOptions: { headers: await readVisitorHeaders() },
    });
    return data;
  } catch {
    return null;
  }
});

/**
 * The Session of someone this App lets in, or a redirect to Sign in for
 * anyone else. Every signed-in page runs it through `withAppSession`.
 * Kept in the browser only (`use cache: private`, never on the server) for
 * `AUTH.SESSION.PAGE_CHECK_STALE_S`: only a passed check, since a redirect
 * throws and nothing thrown is kept.
 */
export const requireAppSession = async (): Promise<Session> => {
  "use cache: private";
  cacheLife({ stale: AUTH.SESSION.PAGE_CHECK_STALE_S });
  const session = await getSession();
  if (!entersApp(session)) {
    return redirectTo(await getLocale(), AUTH.PAGE.SIGN_IN);
  }
  return session;
};
