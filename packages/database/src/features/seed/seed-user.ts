import { z } from "zod";
import { AllowedApp, Role } from "../../../generated/prisma/enums";

/** A seeded User. Parsed, not cast: a typo in the mock file fails the seed. */
export const seedUserSchema = z.object({
  allowedApps: z.array(z.enum(AllowedApp)),
  email: z.email(),
  name: z.string(),
  role: z.enum(Role),
});

export const seedUsersSchema = z.array(seedUserSchema);

export type SeedUser = z.infer<typeof seedUserSchema>;
