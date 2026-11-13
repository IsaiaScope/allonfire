import { API } from "@allonfire/api/shared/constants/api";
import {
  type AOFAvatarChange,
  avatarChangeOf,
} from "@allonfire/ui/features/form/avatar-field/utils/avatar-change";
import { updateTag } from "next/cache";
import type { ApiClient } from "@/features/api/utils/api";
import { textOf } from "@/features/api/utils/api-refusal";
import { STORAGE } from "@/features/storage/constants/storage";
import { USERS } from "../constants/users";
import {
  perApp,
  roleChoiceSchema,
  verificationChoiceSchema,
} from "./user-form-schema";

/** The Role rows as posted (`roles.<app>`); an unknown choice reads as "Not a member", never an error. */
export const rolesOf = (form: FormData) =>
  perApp((app) =>
    roleChoiceSchema.catch(USERS.NO_ROLE).parse(textOf(form, `roles.${app}`))
  );

/** The verification row as posted; an unknown choice reads as verified. */
export const verificationOf = (form: FormData) =>
  verificationChoiceSchema
    .catch(USERS.VERIFICATION.VERIFIED)
    .parse(textOf(form, USERS.FORM_FIELDS.VERIFICATION.verification));

/** The picture's change as both User forms post it (`USERS.AVATAR_FIELD`). */
export const userAvatarChangeOf = (form: FormData) =>
  avatarChangeOf(form, USERS.AVATAR_FIELD);

/** The new picture a change brings, for the form's schema; none otherwise. */
export const pictureOf = (change: AOFAvatarChange) =>
  change.kind === "picture" ? change.file : null;

/**
 * Sends the picture's change once the User is saved, on the `version` that
 * save answered, so a change landing between the two is refused (409): the
 * API's answer (a network error when it never got there, so the action still
 * answers), or null when there was nothing to send. A picture stored or
 * removed moved the bucket, so this drops Home's Storage numbers itself: no
 * action that sends a picture can forget it. Call it inside a server action.
 */
export const sendAvatarChange = async (
  client: ApiClient,
  {
    change,
    id,
    version,
  }: { change: AOFAvatarChange; id: string; version: string }
): Promise<Response | null> => {
  const { avatar } = client[API.VERSION.CURRENT].users[":id"];
  if (change.kind === "unchanged") {
    return null;
  }
  const sent =
    change.kind === "picture"
      ? avatar.$put({ form: { file: change.file, version }, param: { id } })
      : avatar.$delete({ json: { version }, param: { id } });
  const res = await sent.catch(() => Response.error());
  updateTag(STORAGE.CACHE.TAG);
  return res;
};
