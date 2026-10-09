import { objectValues } from "@allonfire/core/shared/utils/object";
import { z } from "zod";
import { App, Role } from "../../../generated/prisma/enums";
import type { SeedEnv } from "../../environment/seed-environment";
import { appSchema, roleSchema } from "../auth/access/constants/schemas";

/** A seeded User and the Apps they belong to. Parsed, not cast: a typo in the mock file fails the seed. */
export const seedUserSchema = z.object({
  email: z.email(),
  memberships: z.array(z.object({ app: appSchema, role: roleSchema })).min(1),
  name: z.string(),
});

export const seedUsersSchema = z.array(seedUserSchema);

export type SeedUser = z.infer<typeof seedUserSchema>;

/**
 * What an App adds to the seed: users seeded in every mode (their password
 * from the env) and a mock users file seeded in dev. Listed in
 * `features/apps/seeds.ts`; the shared seed never names an App.
 */
export type AppSeed = {
  users: (env: SeedEnv) => SeedUser[];
  password: (env: SeedEnv) => string;
  mockUsersFile: string;
};

/** The main admin: Admin of every App there is today; a new App's changeset adds its row. */
export const adminSeedUser = (email: string, name: string): SeedUser => ({
  email,
  memberships: objectValues(App).map((app) => ({ app, role: Role.ADMIN })),
  name,
});
