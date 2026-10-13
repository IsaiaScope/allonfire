import { readVisitorHeaders } from "@allonfire/core/features/next/api/forwarded-for";
import {
  accessUserFrom,
  canEnterApp,
} from "@allonfire/database/features/auth/access/access";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { nextAuthEnv } from "../../../environment/next-environment";
import { AUTH } from "../../../shared/constants/auth";
import { createApiAuthClient, type Session } from "./auth-client";
import { redirectTo } from "./redirect-to";

/**
 * The visitor's Session, read from the API with the browser's cookies; `null`
 * when signed out or the API cannot say. The App's proxy has already renewed
 * the cookies (`refreshSession`), so a renewal the API sends here is a repeat.
 */
export const getSession = async (): Promise<Session | null> => {
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
};

/**
 * The guard every signed-in page calls first: the Session of someone this App
 * (`AUTH_APP`, its row in `ACCESS.APP_SETTINGS`) lets in, or a redirect to Sign in
 * for anyone else. Checked where the page renders, not in a layout, so each
 * navigation checks again.
 */
export const requireAppSession = async (): Promise<Session> => {
  const session = await getSession();
  if (
    !(
      session && canEnterApp(accessUserFrom(session.user), nextAuthEnv.AUTH_APP)
    )
  ) {
    return redirectTo(await getLocale(), AUTH.PAGE.SIGN_IN);
  }
  return session;
};
