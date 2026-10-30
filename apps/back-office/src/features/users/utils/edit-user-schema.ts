import { z } from "zod";
import { USERS } from "../constants/users";
import {
  mismatchOf,
  samePasswords,
  type UserFieldMessages,
  userFormFields,
} from "./user-form-schema";

/** Why the Edit a User action refused. */
export const editUserErrorSchema = z.enum(USERS.EDIT_ERROR);
export type EditUserError = z.infer<typeof editUserErrorSchema>;

/** What the Edit a User action says once the User is saved. */
export const editUserNoticeSchema = z.enum(USERS.EDIT_NOTICE);
export type EditUserNotice = z.infer<typeof editUserNoticeSchema>;

/**
 * The Edit a User form's checks (ADR 0017): the User form's fields, without
 * the email, which never changes. Both password fields empty keep the one
 * the User has; once either holds text, Add a User's rules apply and the two
 * must match. The action's run is the one that counts.
 */
export const editUserSchema = (messages?: UserFieldMessages) =>
  z
    .object(userFormFields(messages, { keepable: true }))
    .refine(samePasswords, mismatchOf(messages));

export type EditUserValues = z.input<ReturnType<typeof editUserSchema>>;
/** What the action reads back and returns: everything but the picture. */
export type EditUserFields = Omit<EditUserValues, "avatar">;
