"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { languageOf } from "@allonfire/auth/features/next/utils/redirect-to";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  objectFromEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { serverApi } from "@/features/api/utils/server-api";
import { redirect } from "@/features/i18n/navigation";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";
import {
  type AddUserError,
  type AddUserValues,
  addUserSchema,
  membershipsOf,
  roleChoiceSchema,
} from "../utils/add-user-schema";

/** Why adding failed, and what was typed, so the form keeps it. */
export type AddUserState = {
  error?: AddUserError;
  values?: AddUserValues;
};

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** The form's fields as the schema reads them; a Role row posts `roles.<app>`. */
const valuesOf = (form: FormData): AddUserValues => ({
  confirmPassword: text(form, "confirmPassword"),
  email: text(form, "email"),
  name: text(form, "name"),
  password: text(form, "password"),
  // An unknown choice reads as "Not a member", never an error.
  roles: objectFromEntries(
    objectValues(App).map((app) => [
      app,
      roleChoiceSchema.catch(USERS.NO_ROLE).parse(text(form, `roles.${app}`)),
    ])
  ),
});

/**
 * Adds a User through the API as the visitor (an Admin, checked there). On
 * success goes to the Users list in the locale the form bound, where the new
 * User is first; otherwise hands back why and what was typed. The checks
 * here are the ones that count.
 */
export const addUser = async (
  locale: string,
  _state: AddUserState,
  form: FormData
): Promise<AddUserState> => {
  const values = valuesOf(form);
  const parsed = addUserSchema().safeParse(values);
  if (!parsed.success) {
    return { error: USERS.ADD_ERROR.INVALID, values };
  }
  const { email, name, password, roles } = parsed.data;
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].users.$post({
    json: { email, memberships: membershipsOf(roles), name, password },
  });
  if (res.status === HTTP.STATUS.CONFLICT) {
    return { error: USERS.ADD_ERROR.TAKEN, values };
  }
  if (res.status !== HTTP.STATUS.CREATED) {
    return { error: USERS.ADD_ERROR.FAILED, values };
  }
  return redirect({ href: BACK_OFFICE.PAGE.USERS, locale: languageOf(locale) });
};
