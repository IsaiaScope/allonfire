import { resolve } from "node:path";
import { App, Role } from "../../../../../generated/prisma/enums";
import type { SeedEnv } from "../../../../environment/seed-environment";
import type { AppSeed, SeedUser } from "../../../seed/seed-user";

type LauraSeedEnv = Pick<SeedEnv, "DATABASE_SEED_LAURA_VIEWER_EMAIL">;

/** The guest Viewer Laura shares with family; seeded in every mode. */
export const lauraSeedUsers = ({
  DATABASE_SEED_LAURA_VIEWER_EMAIL: email,
}: LauraSeedEnv): SeedUser[] => [
  {
    email,
    memberships: [{ app: App.LAURA, role: Role.VIEWER }],
    name: email.split("@")[0] ?? "laura-viewer",
  },
];

export const lauraSeed: AppSeed = {
  mockUsersFile: resolve(import.meta.dirname, "mock/users.json"),
  password: (env) => env.DATABASE_SEED_LAURA_VIEWER_PASSWORD,
  users: lauraSeedUsers,
};
