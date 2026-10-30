import { USER } from "@allonfire/auth/features/users/constants/users";
import { z } from "zod";
import { USERS } from "../constants/users";
import {
  mismatchOf,
  samePasswords,
  type UserFieldMessages,
  userFormFields,
} from "./user-form-schema";

/** The Add a User form's field messages, translated by the form. */
export type AddUserFieldMessages = UserFieldMessages & {
  emailInvalid: string;
  emailRequired: string;
};

/** Why the Add a User action refused. */
export const addUserErrorSchema = z.enum(USERS.ADD_ERROR);
export type AddUserError = z.infer<typeof addUserErrorSchema>;

/**
 * The Add a User form's checks (ADR 0017): the User form's fields, a password
 * required, plus the email, each with its message (zod's own when none are
 * given: the action shows none). The action's run is the one that counts;
 * the form's spares a round trip. The User module lowercases the email.
 */
export const addUserSchema = (messages?: AddUserFieldMessages) =>
  z
    .object({
      // First, so its message leads the name's, as on the form.
      email: z
        .string()
        .trim()
        .min(1, messages?.emailRequired)
        .pipe(z.email(messages?.emailInvalid).max(USER.LIMIT.EMAIL_MAX)),
      ...userFormFields(messages, { keepable: false }),
    })
    .refine(samePasswords, mismatchOf(messages));

export type AddUserValues = z.input<ReturnType<typeof addUserSchema>>;
/** What the action reads back and returns: everything but the picture. */
export type AddUserFields = Omit<AddUserValues, "avatar">;

/** Why the action, past adding the User, still has something to say. */
export const addUserNoticeSchema = z.enum(USERS.ADD_NOTICE);
export type AddUserNotice = z.infer<typeof addUserNoticeSchema>;
