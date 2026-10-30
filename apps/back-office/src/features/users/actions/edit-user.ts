"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { serverApi } from "@/features/api/utils/server-api";
import { USERS } from "../constants/users";
import {
  type EditUserError,
  type EditUserFields,
  type EditUserNotice,
  editUserSchema,
} from "../utils/edit-user-schema";
import {
  pictureOf,
  refusalOf,
  rolesOf,
  sendAvatarChange,
  textOf,
  userAvatarChangeOf,
} from "../utils/user-form-data";
import { membershipsOf } from "../utils/user-form-schema";

/**
 * Why saving failed and what was typed, so the form keeps it; or, the User
 * saved, whether their picture was too (`notice`).
 */
export type EditUserState = {
  error?: EditUserError;
  notice?: EditUserNotice;
  values?: EditUserFields;
};

/** The form's fields as the schema reads them. */
const valuesOf = (form: FormData): EditUserFields => ({
  confirmPassword: textOf(form, "confirmPassword"),
  name: textOf(form, "name"),
  password: textOf(form, "password"),
  roles: rolesOf(form),
});

/**
 * Saves a User through the API as the visitor (an Admin, checked there):
 * their name, their Roles, a new password when one was typed, then their
 * picture. It never redirects: the form toasts what it answers and opens the
 * list. A refusal hands back why and what was typed. The checks here are the
 * ones that count.
 */
export const editUser = async (
  id: string,
  _state: EditUserState,
  form: FormData
): Promise<EditUserState> => {
  const values = valuesOf(form);
  const avatar = userAvatarChangeOf(form);
  const parsed = editUserSchema().safeParse({
    ...values,
    avatar: pictureOf(avatar),
  });
  if (!parsed.success) {
    return { error: USERS.EDIT_ERROR.INVALID, values };
  }
  const { name, password, roles } = parsed.data;
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].users[":id"].$patch({
    json: {
      memberships: membershipsOf(roles),
      name,
      ...(password && { password }),
    },
    param: { id },
  });
  if (res.status !== HTTP.STATUS.OK) {
    const error = await refusalOf(
      res,
      USERS.EDIT_ERROR,
      new Map<number | string, EditUserError>([
        [HTTP.STATUS.NOT_FOUND, USERS.EDIT_ERROR.GONE],
        [USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE, USERS.EDIT_ERROR.OWN_ROLE],
      ])
    );
    return { error, values };
  }
  const sent = await sendAvatarChange(client, id, avatar);
  // The kept list holds the old values.
  updateTag(USERS.CACHE.TAG);
  // Deleted by another Admin between the save and their picture.
  if (sent?.status === HTTP.STATUS.NOT_FOUND) {
    return { error: USERS.EDIT_ERROR.GONE, values };
  }
  return {
    notice:
      !sent || sent.ok
        ? USERS.EDIT_NOTICE.SAVED
        : USERS.EDIT_NOTICE.AVATAR_FAILED,
  };
};
