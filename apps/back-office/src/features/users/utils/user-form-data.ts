import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { z } from "zod";
import type { ApiClient } from "@/features/api/utils/api";
import { USERS } from "../constants/users";
import { perApp, roleChoiceSchema } from "./user-form-schema";

/** A posted field's text; none when missing or a file. */
export const textOf = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** The Role rows as posted (`roles.<app>`); an unknown choice reads as "Not a member", never an error. */
export const rolesOf = (form: FormData) =>
  perApp((app) =>
    roleChoiceSchema.catch(USERS.NO_ROLE).parse(textOf(form, `roles.${app}`))
  );

/**
 * The picture's change as the field posts it: a new one, cropped in the
 * browser (`picture`), the current one removed with none replacing it
 * (`removed`), or neither.
 */
export type AvatarChange = { picture: File | null; removed: boolean };

export const avatarChangeOf = (form: FormData): AvatarChange => {
  const picture = form.get("avatar");
  return {
    picture: picture instanceof File && picture.size > 0 ? picture : null,
    removed: textOf(form, USERS.AVATAR_REMOVED) === "true",
  };
};

/**
 * Sends the picture's change once the User is saved: the API's answer, or
 * null when there was nothing to send.
 */
export const sendAvatarChange = async (
  client: ApiClient,
  id: string,
  { picture, removed }: AvatarChange
): Promise<Response | null> => {
  const { avatar } = client[API.VERSION.CURRENT].users[":id"];
  if (picture) {
    return await avatar.$put({ form: { file: picture }, param: { id } });
  }
  if (removed) {
    return await avatar.$delete({ param: { id } });
  }
  return null;
};

const problemSchema = z.object({ code: z.string() }).catch({ code: "" });

/**
 * Why the API refused a User form's write, as the form says it: the answer
 * `known` gives for the problem's code, else for the status. Past those, a
 * 401 or a 403 means the Session is gone or no longer lets the visitor
 * change Users (a new password ended it, a Role was taken away): trying
 * again never works, signing in again might (`REFUSED`); anything else is
 * `FAILED`. A Map, so a code that names something every object has
 * (`constructor`) finds nothing.
 */
export const refusalOf = async <E extends string>(
  res: Response,
  { FAILED, REFUSED }: { FAILED: E; REFUSED: E },
  known: ReadonlyMap<number | string, E>
): Promise<E> => {
  const { code } = problemSchema.parse(await res.json().catch(() => null));
  const answer = known.get(code) ?? known.get(res.status);
  if (answer) {
    return answer;
  }
  return res.status === HTTP.STATUS.UNAUTHORIZED ||
    res.status === HTTP.STATUS.FORBIDDEN
    ? REFUSED
    : FAILED;
};
