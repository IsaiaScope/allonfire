import { USER } from "@allonfire/auth/features/users/constants/users";
import { meetsPasswordRules } from "@allonfire/auth/features/users/utils/password-rules";
import { z } from "zod";

/**
 * The Forgot password form's check in the browser (ADR 0017): an email,
 * as `requestResetLink` asks on the server, whose check counts.
 */
export const forgotSchema = (messages: {
  emailInvalid: string;
  emailRequired: string;
}) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .pipe(z.email(messages.emailInvalid)),
  });

/**
 * The Reset password form's checks in the browser: the password rules and
 * the confirmation typed the same, as `resetWithToken` checks on the server.
 * One message for any rule missed: the list under the fields says which.
 */
export const resetSchema = (messages: {
  passwordMismatch: string;
  passwordWeak: string;
}) =>
  z
    .object({
      confirmPassword: z.string(),
      password: z
        .string()
        .max(USER.LIMIT.PASSWORD_MAX)
        .refine(meetsPasswordRules, messages.passwordWeak),
    })
    .refine(({ confirmPassword, password }) => confirmPassword === password, {
      error: messages.passwordMismatch,
      path: ["confirmPassword"],
    });
