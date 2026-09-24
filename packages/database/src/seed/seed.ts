import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "better-auth/crypto";
import type { Role } from "../../generated/prisma/client";
import { prisma } from "../client";
import { seedEnv } from "../environment/seed-environment";

type SeedUser = {
  email: string;
  name: string;
  role: string;
  allowedApps: string[];
};

const MOCK_DIR = resolve(import.meta.dirname, "mock");

function readSeedFile<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(MOCK_DIR, filename), "utf-8"));
}

async function upsertUser(
  { email, name, role, allowedApps }: SeedUser,
  hashedPassword: string
) {
  const typedRole = role as Role;
  const user = await prisma.user.upsert({
    create: { allowedApps, email, emailVerified: true, name, role: typedRole },
    update: { allowedApps, role: typedRole },
    where: { email },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { providerId: "credential", userId: user.id },
  });

  if (existingAccount) {
    await prisma.account.update({
      data: { password: hashedPassword },
      where: { id: existingAccount.id },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: user.id,
        password: hashedPassword,
        providerId: "credential",
        userId: user.id,
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
      allowedApps: ["all"],
      email: seedEnv.ADMIN_EMAIL,
      name: adminName,
      role: "ADMIN",
    },
    adminHash
  );

  // Always seed the Laura viewer account (like admin, available in all modes)
  const lauraViewerHash = await hashPassword(seedEnv.LAURA_VIEWER_PASSWORD);
  await upsertUser(
    {
      allowedApps: ["laura"],
      email: seedEnv.LAURA_VIEWER_EMAIL,
      name: seedEnv.LAURA_VIEWER_EMAIL.split("@")[0] ?? "laura-viewer",
      role: "VIEWER",
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
