"use server";

import { AUTH } from "../../../shared/constants/auth";
import { redirectTo } from "../utils/redirect-to";
import { signOutOfApi } from "../utils/sign-out";

/**
 * Ends the Session and goes back to Sign in, in the locale the form bound
 * (`signOut.bind(null, locale)`).
 */
export const signOut = async (locale: string) => {
  await signOutOfApi();
  return redirectTo(locale, AUTH.PAGE.SIGN_IN);
};
