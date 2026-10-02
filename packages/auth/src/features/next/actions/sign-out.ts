"use server";

import { APP_PATH } from "../constants/access";
import { redirectTo } from "../utils/redirect-to";
import { signOutOfApi } from "../utils/sign-out";

/**
 * Ends the Session and goes back to Sign in, in the locale the form bound
 * (`signOut.bind(null, locale)`).
 */
export const signOut = async (locale: string) => {
  await signOutOfApi();
  return redirectTo(locale, APP_PATH.SIGN_IN);
};
