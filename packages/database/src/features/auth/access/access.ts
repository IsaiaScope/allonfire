import { AllowedApp, type Role } from "../../../../generated/prisma/enums";
import { ROLE_RANK } from "./constants/roles";
import { type App, allowedAppSchema, roleSchema } from "./constants/schemas";

/**
 * Every rule about Roles and Allowed apps, beside the enums they read, so the
 * API, every App and this package's own services apply the same ones.
 */

/** What the rules read from a User. */
export type AccessUser = { allowedApps: readonly AllowedApp[]; role: Role };

/**
 * Who an App lets in, declared by the App itself: which App it is and the
 * lowest Role it admits.
 */
export type AppPolicy = { app: App; minRole: Role };

/** True when `role` reaches at least `min`: `hasRole(Role.ADMIN, Role.USER)`. */
export const hasRole = (role: Role, min: Role): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[min];

/**
 * Whether a User sees content shown by `app`: `ALL` content reaches any
 * signed-in User, an App's own content the Users allowed into that App.
 */
export const canSeeContent = (
  allowedApps: readonly AllowedApp[],
  app: AllowedApp
): boolean =>
  app === AllowedApp.ALL ||
  allowedApps.includes(AllowedApp.ALL) ||
  allowedApps.includes(app);

/**
 * Whether a User is allowed into an App: its Allowed apps hold the App and its Role
 * reaches the App's floor. The API's `requireApp` and a Next App's
 * `canAccess` both apply it.
 */
export const canEnterApp = (
  { allowedApps, role }: AccessUser,
  { app, minRole }: AppPolicy
): boolean => canSeeContent(allowedApps, app) && hasRole(role, minRole);

/**
 * A User read as plain strings (Better Auth has no enum array type), narrowed
 * without a cast. An unknown App grants nothing, so it is dropped. An unknown
 * Role means the database is ahead of this build (a Role added by Liquibase
 * before the App shipped, or an App rolled back): throw, so the host logs it
 * and answers 500, instead of letting `hasRole` read an `undefined` rank.
 */
export const accessUserFrom = (user: {
  allowedApps: readonly string[];
  role: string;
}): { allowedApps: AllowedApp[]; role: Role } => {
  const role = roleSchema.safeParse(user.role);
  if (!role.success) {
    throw new Error(
      `Unknown Role "${user.role}": the database is ahead of this build`
    );
  }
  return {
    allowedApps: user.allowedApps.flatMap((value) => {
      const parsed = allowedAppSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    }),
    role: role.data,
  };
};
