"use server";

import { AUTH } from "../../../shared/constants/auth";
import type { ForgotState, ResetState } from "../constants/api";
import { requestResetLink, resetWithToken } from "../utils/password-reset";
import { languageOf, redirectTo } from "../utils/redirect-to";

/**
 * The Forgot password form's action, bound to the page's locale and the
 * App's reset page (`requestPasswordReset.bind(null, locale, resetPage)`):
 * `sent` whether or not the address has an account, else why it could not
 * be asked.
 */
export const requestPasswordReset = async (
  locale: string,
  resetPage: string,
  _previous: ForgotState,
  formData: FormData
): Promise<ForgotState> => {
  const error = await requestResetLink(formData, {
    language: languageOf(locale),
    resetPage,
  });
  return error ? { error } : { sent: true };
};

/**
 * The Reset password form's action, bound to the locale and the link's
 * token: Sign in once the password is set, else why not.
 */
export const resetPassword = async (
  locale: string,
  token: string,
  _previous: ResetState,
  formData: FormData
): Promise<ResetState> => {
  const error = await resetWithToken(formData, {
    language: languageOf(locale),
    token,
  });
  if (error) {
    return { error };
  }
  return redirectTo(locale, AUTH.PAGE.SIGN_IN);
};
