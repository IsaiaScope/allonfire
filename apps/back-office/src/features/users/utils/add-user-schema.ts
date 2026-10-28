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

/** The Add a User form's field messages, translated by the form. */
export type AddUserFieldMessages = {
  emailInvalid: string;
  emailRequired: string;
  nameRequired: string;
  passwordMismatch: string;
  passwordWeak: string;
};

// The App's own zod (a schema crosses no package): the Roles from the enum's
// values, plus the row's "Not a member".
export const roleChoiceSchema = z.enum([...objectValues(Role), USERS.NO_ROLE]);
export type RoleChoice = z.infer<typeof roleChoiceSchema>;

/** Why the Add a User action refused. */
export const addUserErrorSchema = z.enum(USERS.ADD_ERROR);
export type AddUserError = z.infer<typeof addUserErrorSchema>;

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
 * The Add a User form's checks (ADR 0017): the API's limits, each with its
 * message (zod's own when none are given: the action shows none), the
 * password typed twice alike, and a Role choice per App. The action's run is
 * the one that counts; the form's spares a round trip. The User module
 * lowercases the email.
 */
export const addUserSchema = (messages?: AddUserFieldMessages) =>
  z
    .object({
      /** Its picture, cropped in the browser: the form's own, never in the action's answer. */
      avatar: z.instanceof(File).nullable(),
      confirmPassword: z.string(),
      email: z
        .string()
        .trim()
        .min(1, messages?.emailRequired)
        .pipe(z.email(messages?.emailInvalid).max(USER.LIMIT.EMAIL_MAX)),
      name: z
        .string()
        .trim()
        .min(1, messages?.nameRequired)
        .max(USER.LIMIT.NAME_MAX),
      // One message for any rule missed: the list under the field says which.
      password: z
        .string()
        .max(USER.LIMIT.PASSWORD_MAX)
        .refine(meetsPasswordRules, messages?.passwordWeak),
      roles: z.object(
        objectFromEntries(
          objectValues(App).map((app) => [app, roleChoiceSchema])
        )
      ),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: messages?.passwordMismatch,
      path: ["confirmPassword"],
      // Said even while another field is wrong, as each field's own is.
      when: ({ issues }) =>
        !issues.some(({ path }) => path?.[0] === "confirmPassword"),
    });

export type AddUserValues = z.input<ReturnType<typeof addUserSchema>>;
/** What the action reads back and returns: everything but the picture. */
export type AddUserFields = Omit<AddUserValues, "avatar">;

/** Why the action, past adding the User, still has something to say. */
export const addUserNoticeSchema = z.enum(USERS.ADD_NOTICE);
export type AddUserNotice = z.infer<typeof addUserNoticeSchema>;

/** Every App at "Not a member": where the form starts. */
export const NO_ROLES = objectFromEntries(
  objectValues(App).map((app) => [app, USERS.NO_ROLE])
) satisfies Record<App, RoleChoice>;

/** The Role rows as Memberships, leaving out the Apps the User is not in. */
export const membershipsOf = (roles: Record<App, RoleChoice>) =>
  objectEntries(roles).flatMap(([app, role]) =>
    role === USERS.NO_ROLE ? [] : [{ app, role }]
  );
