"use server";

import { APP_PATH } from "../constants/access";
import type { SignInState } from "../constants/api";
import { redirectTo } from "../utils/redirect-to";
import { signInWithEmail } from "../utils/sign-in";

/**
 * The Sign in form's action, for `useActionState` (Next's forms guide: a
 * form that shows errors holds the action's state in a client component).
 * Goes home once signed in, in the locale the form bound
 * (`signIn.bind(null, locale)`); otherwise hands back why, and the page stays
 * as it is.
 */
export const signIn = async (
  locale: string,
  _previous: SignInState,
  formData: FormData
): Promise<SignInState> => {
  const error = await signInWithEmail(formData);
  if (error) {
    return { error };
  }
  return redirectTo(locale, APP_PATH.HOME);
};
