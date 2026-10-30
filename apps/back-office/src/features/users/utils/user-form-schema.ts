import { USER } from "@allonfire/auth/features/users/constants/users";
import {
  meetsPasswordRules,
  passwordRules,
} from "@allonfire/auth/features/users/utils/password-rules";
import {
  objectEntries,
  objectFromEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { z } from "zod";
import { USERS } from "../constants/users";

/** The field messages both User forms share, translated by the form. */
export type UserFieldMessages = {
  nameRequired: string;
  passwordMismatch: string;
  passwordWeak: string;
};

// The App's own zod (a schema crosses no package): the Roles from the enum's
// values, plus the row's "Not a member".
export const roleChoiceSchema = z.enum([...objectValues(Role), USERS.NO_ROLE]);
export type RoleChoice = z.infer<typeof roleChoiceSchema>;

/** One value per App, every App present: `perApp((app) => ...)`. */
export const perApp = <T>(of: (app: App) => T): Record<App, T> =>
  objectFromEntries(objectValues(App).map((app) => [app, of(app)]));

/** A Role choice per App, every App present. */
const rolesSchema = z.object(perApp(() => roleChoiceSchema));

/** Every App at "Not a member": where the Add form starts. */
export const NO_ROLES: Record<App, RoleChoice> = perApp(() => USERS.NO_ROLE);

/** The Role rows as Memberships, leaving out the Apps the User is not in. */
export const membershipsOf = (roles: Record<App, RoleChoice>) =>
  objectEntries(roles).flatMap(([app, role]) =>
    role === USERS.NO_ROLE ? [] : [{ app, role }]
  );

/** The password and its confirmation, as typed. */
type PasswordPair = { confirmPassword: string; password: string };

/**
 * The rules the form ticks live: the User module's, and the confirmation
 * typed the same.
 */
export const passwordChecks = ({
  confirmPassword,
  password,
}: PasswordPair) => ({
  ...passwordRules(password),
  match: password !== "" && password === confirmPassword,
});

/**
 * The fields both User forms hold (ADR 0017), checked against the API's
 * limits: the picture, the name, the password typed twice (`keepable`: both
 * empty keep the one the User has) and a Role choice per App.
 */
export const userFormFields = (
  messages: UserFieldMessages | undefined,
  { keepable }: { keepable: boolean }
) => ({
  /** Its picture, cropped in the browser: the form's own, never in the action's answer. */
  avatar: z.instanceof(File).nullable(),
  confirmPassword: z.string(),
  name: z
    .string()
    .trim()
    .min(1, messages?.nameRequired)
    .max(USER.LIMIT.NAME_MAX),
  // One message for any rule missed: the list under the field says which.
  password: z
    .string()
    .max(USER.LIMIT.PASSWORD_MAX)
    .refine(
      (password) =>
        (keepable && password === "") || meetsPasswordRules(password),
      messages?.passwordWeak
    ),
  roles: rolesSchema,
});

/** The confirmation typed as the password. */
export const samePasswords = ({ confirmPassword, password }: PasswordPair) =>
  password === confirmPassword;

/**
 * Where `samePasswords` says it missed: under the confirmation, even while
 * another field is wrong, as each field's own message is.
 */
export const mismatchOf = (
  messages: UserFieldMessages | undefined
): z.core.$ZodCustomParams => ({
  error: messages?.passwordMismatch,
  path: ["confirmPassword"],
  when: ({ issues }) =>
    !issues.some(({ path }) => path?.[0] === "confirmPassword"),
});
