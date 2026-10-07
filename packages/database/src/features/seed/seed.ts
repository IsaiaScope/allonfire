import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { hashPassword } from "better-auth/crypto";
import { AllowedApp, Role } from "../../../generated/prisma/client";
import { seedEnv } from "../../environment/seed-environment";
import { APP_SEEDS } from "../apps/seeds";
import { prisma } from "../prisma/client";
import { seedUsersSchema } from "./seed-user";
import { upsertUser } from "./upsert-user";

const MOCK_DIR = resolve(import.meta.dirname, "mock");

async function main() {
  // Always seed the main admin
  const adminName =
    seedEnv.DATABASE_SEED_ADMIN_NAME ??
    seedEnv.DATABASE_SEED_ADMIN_EMAIL.split("@")[0] ??
    "Admin";
  const adminHash = await hashPassword(seedEnv.DATABASE_SEED_ADMIN_PASSWORD);

  await upsertUser(
    {
      allowedApps: [AllowedApp.ALL],
      email: seedEnv.DATABASE_SEED_ADMIN_EMAIL,
      name: adminName,
      role: Role.ADMIN,
    },
    adminHash
  );

  // Each App's own users, seeded in every mode (Laura's guest Viewer).
  await Promise.all(
    APP_SEEDS.map(async (app) => {
      const hash = await hashPassword(app.password(seedEnv));
      await Promise.all(
        app.users(seedEnv).map((user) => upsertUser(user, hash))
      );
    })
  );

  if (seedEnv.DATABASE_SEED_MODE === "dev") {
    if (!seedEnv.DATABASE_SEED_TEST_PASSWORD) {
      console.error(
        "DATABASE_SEED_TEST_PASSWORD is required when DATABASE_SEED_MODE=dev"
      );
      process.exit(1);
    }

    const testHash = await hashPassword(seedEnv.DATABASE_SEED_TEST_PASSWORD);
    const testUsers = [
      resolve(MOCK_DIR, "users.json"),
      ...APP_SEEDS.map(({ mockUsersFile }) => mockUsersFile),
    ].flatMap((path) =>
      parseJsonWith(readFileSync(path, "utf-8"), seedUsersSchema)
    );

    await Promise.all(testUsers.map((user) => upsertUser(user, testHash)));

    console.log(`\nSeeded ${testUsers.length} test users`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
