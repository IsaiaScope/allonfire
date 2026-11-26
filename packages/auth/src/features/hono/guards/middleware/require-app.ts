import type { App, Role } from "@allonfire/database/enums";
import { canEnterApp } from "@allonfire/database/features/auth/access/access";
import { guard } from "../utils/guard";

/**
 * 403 unless the User is allowed into the App (`canEnterApp`): a Membership
 * there whose Role reaches the App's floor in `ACCESS.APP_SETTINGS`.
 * `requireApp(app)`, mounted once per App. `min` raises the door for one
 * Section (ADR 0032): an Admin-only Section passes `Role.ADMIN`; it can never
 * lower the App's floor.
 */
export const requireApp = (app: App, min?: Role) =>
  guard(({ user }) => canEnterApp(user, app, min));
