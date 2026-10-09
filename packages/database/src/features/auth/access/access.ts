import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../generated/prisma/enums";
import { APP_SETTINGS, type AppSettingsTable } from "./constants/app-settings";
import { ROLE_RANK } from "./constants/roles";
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
  ROLE_RANK[role] >= ROLE_RANK[min];

/** The User's Role in `app`, or `undefined` when they do not belong to it. */
export const roleIn = (user: AccessUser, app: App): Role | undefined =>
  user.memberships.find((membership) => membership.app === app)?.role;

/**
 * Whether a User is allowed into an App: they belong to it and their Role
 * there reaches the App's floor. The API's `requireApp` and sign-in check, a
 * Next App's `canAccess` and the Image module's reads all apply it.
 */
export const canEnterApp = (user: AccessUser, app: App): boolean => {
  const settings: AppSettingsTable = APP_SETTINGS;
  const role = roleIn(user, app);
  return role !== undefined && hasRole(role, settings[app].minRole);
};

/** Whether a User places Images in `app`, takes them out or switches them public there: Admin in that App. */
export const canManageImage = (user: AccessUser, app: App): boolean =>
  roleIn(user, app) === Role.ADMIN;

/** One App an Image is placed in, and whether it shows there to anyone (ADR 0020). */
export type ImageLink = { app: App; public: boolean };

/**
 * Whether someone sees an Image through one placement: it is public, or they
 * enter its App. `null` is a visitor, not signed in.
 */
export const canSeeImageIn = (
  user: AccessUser | null,
  link: ImageLink
): boolean => link.public || (user !== null && canEnterApp(user, link.app));

/** Whether someone sees an Image anywhere: through any of its placements. */
export const canSeeImage = (
  user: AccessUser | null,
  links: readonly ImageLink[]
): boolean => links.some((link) => canSeeImageIn(user, link));

/**
 * Whether a User changes what every App of an Image sees (its alt, or
 * deleting it everywhere): Admin in every App it is placed in.
 */
export const canManageEverywhere = (
  user: AccessUser,
  links: readonly ImageLink[]
): boolean => links.every(({ app }) => canManageImage(user, app));

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
