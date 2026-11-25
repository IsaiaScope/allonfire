import { HTTP } from "@allonfire/core/features/http/constants/http";
import { textOf } from "@allonfire/core/features/next/api/utils/aof-refusal";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";
import type {
  ForgotError,
  ResetError,
} from "../../../shared/constants/auth-schema";
import { USER } from "../../users/constants/users";
import { meetsPasswordRules } from "../../users/utils/password-rules";
import { appHeaders } from "./app-request";
import { createApiAuthClient } from "./auth-client";

const emailSchema = z.email();

/**
 * Asks the API to email a reset link to the form's address, landing on
 * `resetPage` (the App's page, an origin the API trusts). The API answers
 * the same for any address, so neither does this: no error means asked.
 */
export const requestResetLink = async (
  formData: FormData,
  { language, resetPage }: { language: string; resetPage: string }
): Promise<ForgotError | undefined> => {
  const email = textOf(formData, "email").trim();
  if (!emailSchema.safeParse(email).success) {
    return AUTH.ERROR.FORGOT.INVALID;
  }
  try {
    const { error } = await createApiAuthClient().requestPasswordReset(
      { email, redirectTo: resetPage },
      { headers: await appHeaders(language) }
    );
    if (!error) {
      return undefined;
    }
    return error.status === HTTP.STATUS.TOO_MANY_REQUESTS
      ? AUTH.ERROR.FORGOT.RATE_LIMITED
      : AUTH.ERROR.FORGOT.UNAVAILABLE;
  } catch (err) {
    serverLogger().error({ err }, AUTH.LOG_MESSAGE.RESET_LINK_FAILED);
    return AUTH.ERROR.FORGOT.UNAVAILABLE;
  }
};

/**
 * Sets the new password through a reset link's token; every Session of the
 * User ends at the API. The password must meet the rules and be typed twice
 * the same. No error means set.
 */
export const resetWithToken = async (
  formData: FormData,
  { language, token }: { language: string; token: string }
): Promise<ResetError | undefined> => {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (
    !token ||
    typeof password !== "string" ||
    password !== confirmPassword ||
    password.length > USER.LIMIT.PASSWORD_MAX ||
    !meetsPasswordRules(password)
  ) {
    return AUTH.ERROR.RESET.INVALID;
  }
  try {
    const { error } = await createApiAuthClient().resetPassword(
      { newPassword: password, token },
      { headers: await appHeaders(language) }
    );
    if (!error) {
      return undefined;
    }
    if (error.status === HTTP.STATUS.TOO_MANY_REQUESTS) {
      return AUTH.ERROR.RESET.RATE_LIMITED;
    }
    return error.status === HTTP.STATUS.BAD_REQUEST
      ? AUTH.ERROR.RESET.INVALID_TOKEN
      : AUTH.ERROR.RESET.UNAVAILABLE;
  } catch (err) {
    serverLogger().error({ err }, AUTH.LOG_MESSAGE.PASSWORD_RESET_FAILED);
    return AUTH.ERROR.RESET.UNAVAILABLE;
  }
};
