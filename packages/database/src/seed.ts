import { hashPassword } from "better-auth/crypto";
import type { Role } from "../generated/prisma";
import { prisma } from "./index.js";
import { seedEnv } from "./seed-env.js";

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  allowedApps: string[];
};

const TEST_USERS: SeedUser[] = [
  // allonfire — full access
  {
    email: "allonfire-user@allonfire.com",
    name: "allonfire-user",
    role: "USER",
    allowedApps: ["all"],
  },
  {
    email: "allonfire-viewer@allonfire.com",
    name: "allonfire-viewer",
    role: "VIEWER",
    allowedApps: ["all"],
  },
  // social — social app only
  {
    email: "social-admin@allonfire.com",
    name: "social-admin",
    role: "ADMIN",
    allowedApps: ["social"],
  },
  {
    email: "social-user@allonfire.com",
    name: "social-user",
    role: "USER",
    allowedApps: ["social"],
  },
  {
    email: "social-viewer@allonfire.com",
    name: "social-viewer",
    role: "VIEWER",
    allowedApps: ["social"],
  },
  // laura — laura app only
  {
    email: "laura-admin@allonfire.com",
    name: "laura-admin",
    role: "ADMIN",
    allowedApps: ["laura"],
  },
  {
    email: "laura-user@allonfire.com",
    name: "laura-user",
    role: "USER",
    allowedApps: ["laura"],
  },
  {
    email: "laura-viewer@allonfire.com",
    name: "laura-viewer",
    role: "VIEWER",
    allowedApps: ["laura"],
  },
];

async function upsertUser(
  { email, name, role, allowedApps }: SeedUser,
  hashedPassword: string
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, allowedApps },
    create: { email, name, emailVerified: true, role, allowedApps },
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

  // Optionally seed test users
  if (seedEnv.SEED_TEST_USERS) {
    if (!seedEnv.TEST_PASSWORD) {
      console.error("TEST_PASSWORD is required when SEED_TEST_USERS=true");
      process.exit(1);
    }

    const testHash = await hashPassword(seedEnv.TEST_PASSWORD);

    await Promise.all(TEST_USERS.map((user) => upsertUser(user, testHash)));

    console.log(`\nSeeded ${TEST_USERS.length} test users`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
