import { passwordRules } from "@allonfire/auth/features/users/utils/password-rules";

/** The password and its confirmation, as typed. */
export type PasswordPair = { confirmPassword: string; password: string };

/**
 * The rules a password form ticks live: the User module's, and the
 * confirmation typed the same.
 */
export const passwordChecks = ({
  confirmPassword,
  password,
}: PasswordPair) => ({
  ...passwordRules(password),
  match: password !== "" && password === confirmPassword,
});
