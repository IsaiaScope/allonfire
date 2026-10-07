import { z } from "zod";
import type { SeedEnv } from "../../environment/seed-environment";
import { allowedAppSchema, roleSchema } from "../auth/access/constants/schemas";

/** A seeded User. Parsed, not cast: a typo in the mock file fails the seed. */
export const seedUserSchema = z.object({
  allowedApps: z.array(allowedAppSchema),
  email: z.email(),
  name: z.string(),
  role: roleSchema,
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
