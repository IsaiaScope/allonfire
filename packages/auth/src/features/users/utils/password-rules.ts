import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { USER } from "../constants/users";

/**
 * Each rule an added User's password must meet, met or not: its length
 * (UTF-16 units, as zod counts) and one character of each kind
 * (`PATTERN.CHARACTER`). The one list of them: the API refuses a
 * password missing any (`meetsPasswordRules`), a form ticks them while
 * typing, so a rule added here reaches both.
 */
export const passwordRules = (password: string) => ({
  length: password.length >= USER.LIMIT.PASSWORD_MIN,
  lowercase: PATTERN.CHARACTER.LOWERCASE.test(password),
  number: PATTERN.CHARACTER.DIGIT.test(password),
  symbol: PATTERN.CHARACTER.SYMBOL.test(password),
  uppercase: PATTERN.CHARACTER.UPPERCASE.test(password),
});

/** Whether `password` meets every one of `passwordRules`. */
export const meetsPasswordRules = (password: string) =>
  objectValues(passwordRules(password)).every(Boolean);
