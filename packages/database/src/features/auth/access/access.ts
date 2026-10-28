import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess, Role } from "../../../../generated/prisma/enums";
import { ACCESS } from "./constants/access";
import type { AppSettingsTable } from "./constants/app-settings";
import { appSchema, roleSchema } from "./constants/schemas";

/**
 * Every rule about Roles and Memberships, beside the enums they read, so the
 * API, every App and this package's own services apply the same ones.
 */

/** One App a User belongs to, and their Role there. */
export type AccessMembership = { app: App; role: Role };

/** What the rules read from a User. */
export type AccessUser = { memberships: readonly AccessMembership[] };

/** True when `role` reaches at least `min`: `hasRole(Role.ADMIN, Role.USER)`. */
export const hasRole = (role: Role, min: Role): boolean =>
  ACCESS.ROLE_RANK[role] >= ACCESS.ROLE_RANK[min];

/** The User's Role in `app`, or `undefined` when they do not belong to it. */
export const roleIn = (user: AccessUser, app: App): Role | undefined =>
  user.memberships.find((membership) => membership.app === app)?.role;

/**
 * Whether a User holds at least `min` in `app`: a Membership there whose Role
 * reaches it. `hasRoleIn(user, App.BACK_OFFICE, Role.ADMIN)`.
 */
export const hasRoleIn = (user: AccessUser, app: App, min: Role): boolean => {
  const role = roleIn(user, app);
  return role !== undefined && hasRole(role, min);
};

/**
 * Whether a User is allowed into an App: they belong to it and their Role
 * there reaches the App's floor. The API's `requireApp` and sign-in check, a
 * Next App's `canAccess` and the Image module's reads all apply it.
 */
export const canEnterApp = (user: AccessUser, app: App): boolean => {
  const settings: AppSettingsTable = ACCESS.APP_SETTINGS;
  return hasRoleIn(user, app, settings[app].minRole);
};

/**
 * The Roles that let someone into `app`, those reaching its floor, in the
 * order the enum declares them: what a form offers for a Membership there.
 */
export const entryRoles = (app: App): Role[] => {
  const settings: AppSettingsTable = ACCESS.APP_SETTINGS;
  return objectValues(Role).filter((role) =>
    hasRole(role, settings[app].minRole)
  );
};

/** Whether a User places Images in `app`, takes them out or switches them public there: Admin in that App. */
export const canManageImage = (user: AccessUser, app: App): boolean =>
  roleIn(user, app) === Role.ADMIN;

/** What decides who sees an Image: its access and the Apps it is in (ADR 0027). */
export type ImageVisibility = {
  access: ImageAccess;
  apps: readonly App[];
};

/**
 * Whether someone sees an Image: a public one anyone, a private one those
 * who enter at least one of its Apps. `null` is a visitor, not signed in.
 */
export const canSeeImage = (
  user: AccessUser | null,
  { access, apps }: ImageVisibility
): boolean =>
  access === ImageAccess.PUBLIC ||
  (user !== null && apps.some((app) => canEnterApp(user, app)));

/**
 * Whether a User changes what every App of an Image sees (its alt, its
 * access, or deleting it everywhere): Admin in every App it is placed in.
 */
export const canManageEverywhere = (
  user: AccessUser,
  apps: readonly App[]
): boolean => apps.every((app) => canManageImage(user, app));

/** The Apps someone enters (`canEnterApp`); none for a visitor. */
export const enterableApps = (user: AccessUser | null): App[] =>
  user ? objectValues(App).filter((app) => canEnterApp(user, app)) : [];

/**
 * Memberships read as plain strings (JSON from the API), narrowed without a
 * cast. An unknown App grants nothing, so it is dropped. An unknown Role means
 * the database is ahead of this build: throw, so the host logs it and answers
 * 500, instead of letting `hasRole` read an `undefined` rank.
 */
export const accessUserFrom = (user: {
  memberships: readonly { app: string; role: string }[];
}): AccessUser => ({
  memberships: user.memberships.flatMap(({ app, role }) => {
    const parsedApp = appSchema.safeParse(app);
    if (!parsedApp.success) {
      return [];
    }
    const parsedRole = roleSchema.safeParse(role);
    if (!parsedRole.success) {
      throw new Error(
        `Unknown Role "${role}": the database is ahead of this build`
      );
    }
    return [{ app: parsedApp.data, role: parsedRole.data }];
  }),
});
