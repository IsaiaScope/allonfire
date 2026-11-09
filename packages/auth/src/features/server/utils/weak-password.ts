import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";
import { meetsPasswordRules } from "../../users/utils/password-rules";

const passwordsSchema = z
  .object({
    newPassword: z.string().optional(),
    password: z.string().optional(),
  })
  .catch({});

/** The routes that set a password, and the body field that carries it. */
const PASSWORD_FIELD = new Map<string, keyof z.infer<typeof passwordsSchema>>([
  [AUTH.PATH.SIGN_UP_EMAIL, "password"],
  [AUTH.PATH.RESET_PASSWORD, "newPassword"],
  [AUTH.PATH.CHANGE_PASSWORD, "newPassword"],
]);

/**
 * Whether a request to `path` sets a password that misses one of the rules
 * (`passwordRules`). Better Auth checks only the length; a missing password
 * is left to it.
 */
export const setsWeakPassword = (path: string, body: unknown): boolean => {
  const field = PASSWORD_FIELD.get(path);
  const password = field && passwordsSchema.parse(body)[field];
  return password !== undefined && !meetsPasswordRules(password);
};
