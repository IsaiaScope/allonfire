import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../generated/prisma/enums";
import type { SeedEnv } from "../../environment/seed-environment";

/** A seeded User and the Apps they belong to; the Fixture without a Membership has none. */
export type SeedUser = {
  email: string;
  memberships: { app: App; role: Role }[];
  name: string;
};

/** What the seed reads from its env. */
export type SeedSettings = Pick<
  SeedEnv,
  | "DATABASE_SEED_ADMIN_EMAIL"
  | "DATABASE_SEED_ADMIN_NAME"
  | "DATABASE_SEED_ADMIN_PASSWORD"
>;

/** The main admin: Admin of every App there is today; a new App's changeset adds its row. */
export const adminSeedUser = (email: string, name: string): SeedUser => ({
  email,
  memberships: objectValues(App).map((app) => ({ app, role: Role.ADMIN })),
  name,
});
