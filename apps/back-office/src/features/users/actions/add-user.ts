"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { languageOf } from "@allonfire/auth/features/next/utils/redirect-to";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { serverApi } from "@/features/api/utils/server-api";
import { redirect } from "@/features/i18n/navigation";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";
import {
  type AddUserError,
  type AddUserFields,
  type AddUserNotice,
  addUserSchema,
} from "../utils/add-user-schema";
import {
  avatarChangeOf,
  refusalOf,
  rolesOf,
  sendAvatarChange,
  textOf,
} from "../utils/user-form-data";
import { membershipsOf } from "../utils/user-form-schema";

/**
 * Why adding failed and what was typed, so the form keeps it; or, the User
 * added, what still went wrong (their picture).
 */
export type AddUserState = {
  error?: AddUserError;
  notice?: AddUserNotice;
  values?: AddUserFields;
};

/** The form's fields as the schema reads them. */
const valuesOf = (form: FormData): AddUserFields => ({
  confirmPassword: textOf(form, "confirmPassword"),
  email: textOf(form, "email"),
  name: textOf(form, "name"),
  password: textOf(form, "password"),
  roles: rolesOf(form),
});

/**
 * Adds a User through the API as the visitor (an Admin, checked there), then
 * their picture when one was posted. On success goes to the Users list in the
 * locale the form bound, where the new User is first; a picture the API
 * refused leaves the User added and says so (`notice`); otherwise hands back
 * why and what was typed. The checks here are the ones that count.
 */
export const addUser = async (
  locale: string,
  _state: AddUserState,
  form: FormData
): Promise<AddUserState> => {
  const values = valuesOf(form);
  const avatar = avatarChangeOf(form);
  const parsed = addUserSchema().safeParse({
    ...values,
    avatar: avatar.picture,
  });
  if (!parsed.success) {
    return { error: USERS.ADD_ERROR.INVALID, values };
  }
  const { email, name, password, roles } = parsed.data;
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].users.$post({
    json: { email, memberships: membershipsOf(roles), name, password },
  });
  if (res.status !== HTTP.STATUS.CREATED) {
    const error = await refusalOf(
      res,
      USERS.ADD_ERROR,
      new Map([[HTTP.STATUS.CONFLICT, USERS.ADD_ERROR.TAKEN]])
    );
    return { error, values };
  }
  const { id } = await res.json();
  const sent = await sendAvatarChange(client, id, avatar);
  // The kept lists lack the new User: dropped, so the list shows them first.
  updateTag(USERS.CACHE.TAG);
  if (sent && !sent.ok) {
    return { notice: USERS.ADD_NOTICE.AVATAR_FAILED };
  }
  return redirect({ href: BACK_OFFICE.PAGE.USERS, locale: languageOf(locale) });
};
