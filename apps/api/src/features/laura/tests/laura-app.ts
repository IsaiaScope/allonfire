import type { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { App, Role } from "@allonfire/database/enums";
import { createApp } from "../../../app";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import type { LauraDeps } from "../utils/deps";
import { stubLauraDeps } from "./stub-laura-deps";

export const LAURA_USER = {
  memberships: [{ app: App.LAURA, role: Role.USER }],
};
export const BACK_OFFICE_ADMIN = {
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
};

/** The API with Laura's deps stubbed (`overrides`) and `session` signed in, or nobody. */
export const appWith = (
  overrides: Partial<LauraDeps>,
  session: ReturnType<typeof sessionFor> | null
) =>
  createApp(
    appDeps({
      auth: apiAuth({ getSession: () => Promise.resolve(session) }),
      laura: stubLauraDeps(overrides),
    })
  );
