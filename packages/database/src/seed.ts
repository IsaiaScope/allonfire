import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "better-auth/crypto";
import type { Role } from "../generated/prisma/client";
import { prisma } from "./index.js";
import { seedEnv } from "./seed-env.js";

type SeedUser = {
  email: string;
  name: string;
  role: string;
  allowedApps: string[];
};

const SEED_DATA_DIR = resolve(import.meta.dirname, "../seed-data");

function readSeedFile<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(SEED_DATA_DIR, filename), "utf-8"));
}

async function upsertUser(
  { email, name, role, allowedApps }: SeedUser,
  hashedPassword: string
) {
  const typedRole = role as Role;
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: typedRole, allowedApps },
    create: { email, name, emailVerified: true, role: typedRole, allowedApps },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashedPassword },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  }

  console.log(
    `Seeded: ${email} (role: ${role}, apps: ${allowedApps.join(", ")})`
  );
}

async function main() {
  // Always seed the main admin
  const adminName =
    seedEnv.ADMIN_NAME ?? seedEnv.ADMIN_EMAIL.split("@")[0] ?? "Admin";
  const adminHash = await hashPassword(seedEnv.ADMIN_PASSWORD);

  await upsertUser(
    {
      email: seedEnv.ADMIN_EMAIL,
      name: adminName,
      role: "ADMIN",
      allowedApps: ["all"],
    },
    adminHash
  );

  // Always seed the Laura viewer account (like admin, available in all modes)
  const lauraViewerHash = await hashPassword(seedEnv.LAURA_VIEWER_PASSWORD);
  await upsertUser(
    {
      email: seedEnv.LAURA_VIEWER_EMAIL,
      name: seedEnv.LAURA_VIEWER_EMAIL.split("@")[0] ?? "laura-viewer",
      role: "VIEWER",
      allowedApps: ["laura"],
    },
    lauraViewerHash
  );

  if (seedEnv.SEED_MODE === "dev") {
    if (!seedEnv.TEST_PASSWORD) {
      console.error("TEST_PASSWORD is required when SEED_MODE=dev");
      process.exit(1);
    }

    const testHash = await hashPassword(seedEnv.TEST_PASSWORD);
    const testUsers = readSeedFile<SeedUser[]>("users.json");

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
