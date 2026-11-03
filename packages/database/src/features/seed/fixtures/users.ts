import {
  objectFromEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../generated/prisma/enums";
import { adminSeedUser, type SeedUser } from "../utils/seed-user";

/**
 * The password of every Fixture User. Not a secret: Fixtures exist only in
 * Test databases.
 */
export const PASSWORD = "Fixture-password-1";

/** A second password that meets the rules, for a test that changes one. */
export const NEW_PASSWORD = "Fixture-password-2";

/** The Fixtures' email domain; nothing else in a Test database uses it. */
export const DOMAIN = "allonfire.test";
const slug = (value: string) => value.toLowerCase().replaceAll("_", "-");

const gridUser = (app: App, role: Role): SeedUser => {
  const name = `${slug(app)}-${slug(role)}`;
  return { email: `${name}@${DOMAIN}`, memberships: [{ app, role }], name };
};

const rolesIn = (app: App) =>
  objectFromEntries(
    objectValues(Role).map((role) => [role, gridUser(app, role)] as const)
  );

/**
 * One User per App per Role, generated from the enums so a new App or Role
 * gets its Fixtures without an edit, plus an Admin of every App and a User in
 * none. Emails derive from App and Role: `back-office-admin@allonfire.test`.
 */
export const USER = {
  ...objectFromEntries(
    objectValues(App).map((app) => [app, rolesIn(app)] as const)
  ),
  ADMIN_EVERYWHERE: adminSeedUser(
    `admin-everywhere@${DOMAIN}`,
    "admin-everywhere"
  ),
  NO_MEMBERSHIP: {
    email: `no-membership@${DOMAIN}`,
    memberships: [],
    name: "no-membership",
  },
} satisfies Record<string, unknown>;

/** Every Fixture User, for the seed. */
export const USERS: SeedUser[] = [
  ...objectValues(App).flatMap((app) =>
    objectValues(Role).map((role) => USER[app][role])
  ),
  USER.ADMIN_EVERYWHERE,
  USER.NO_MEMBERSHIP,
];
