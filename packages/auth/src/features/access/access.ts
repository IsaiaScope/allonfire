import { AllowedApp, Role } from "@allonfire/database/enums";
import { objectValues } from "@allonfire/utils/helpers/object";
import { z } from "zod";
import type { App } from "../../shared/types/auth";
import { ROLE_RANK } from "./constants/roles";

const ALLOWED_APPS: ReadonlySet<string> = new Set<AllowedApp>(
  objectValues(AllowedApp)
);

const isAllowedApp = (value: string): value is AllowedApp =>
  ALLOWED_APPS.has(value);

/**
 * Postgres already holds only `AllowedApp` values, but Better Auth has no enum
 * array field type and hands them back as `string[]`. This narrows them without
 * a cast; anything unknown grants nothing, so it is dropped.
 */
export const allowedAppsFrom = (values: readonly string[]): AllowedApp[] =>
  values.filter(isAllowedApp);

const roleSchema = z.enum(Role);

/**
 * Better Auth types `role` as `Role` but never checks it. A value outside the
 * enum means the database is ahead of this build (a Role added by Liquibase
 * before the App shipped, or an App rolled back): throw, so the host logs it
 * and answers 500, instead of letting `hasRole` read an `undefined` rank.
 */
export const roleFrom = (value: string): Role => {
  const parsed = roleSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Unknown Role "${value}": the database is ahead of this build`
    );
  }
  return parsed.data;
};

/** True when `role` reaches at least `min`: `hasRole(Role.ADMIN, Role.USER)`. */
export const hasRole = (role: Role, min: Role): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[min];

export const canEnterApp = (
  allowedApps: readonly AllowedApp[],
  app: App
): boolean => allowedApps.includes(AllowedApp.ALL) || allowedApps.includes(app);
