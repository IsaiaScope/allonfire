import type { App } from "@allonfire/database/enums";
import { canEnterApp } from "@allonfire/database/features/auth/access/access";
import { guard } from "../utils/guard";

/**
 * 403 unless the User is allowed into the App (`canEnterApp`): a Membership
 * there whose Role reaches the App's floor in `APP_SETTINGS`.
 * `requireApp(App.LAURA)`.
 */
export const requireApp = (app: App) =>
  guard(({ user }) => canEnterApp(user, app));
