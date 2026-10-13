import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../generated/prisma/client";
import { APP_SEEDS } from "../apps/seeds";
import { seedFixtures } from "./fixtures/seed-fixtures";
import { adminSeedUser, type SeedSettings } from "./seed-user";
import { upsertUser } from "./upsert-user";

/**
 * The real Admin and each App's own Users in every mode; in `local` mode also
 * every Fixture. It deletes nobody.
 */
export async function seed(client: PrismaClient, settings: SeedSettings) {
  const adminName =
    settings.DATABASE_SEED_ADMIN_NAME ??
    settings.DATABASE_SEED_ADMIN_EMAIL.split("@")[0] ??
    "Admin";
  await upsertUser(
    client,
    adminSeedUser(settings.DATABASE_SEED_ADMIN_EMAIL, adminName),
    await hashPassword(settings.DATABASE_SEED_ADMIN_PASSWORD)
  );

  // Each App's own users, seeded in every mode (Laura's guest Viewer).
  await Promise.all(
    APP_SEEDS.map(async (app) => {
      const hash = await hashPassword(app.password(settings));
      await Promise.all(
        app.users(settings).map((user) => upsertUser(client, user, hash))
      );
    })
  );

  if (settings.DATABASE_SEED_MODE === "local") {
    await seedFixtures(client);
  }
}
