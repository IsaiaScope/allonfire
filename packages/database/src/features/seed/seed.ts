import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../generated/prisma/client";
import { adminSeedUser, type SeedSettings } from "./seed-user";
import { upsertUser } from "./upsert-user";

/**
 * The real Admin, Admin in every App: what Local and Production both hold.
 * The Fixtures go only into the Test template (`seedFixtures`). It deletes
 * nobody.
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
}
