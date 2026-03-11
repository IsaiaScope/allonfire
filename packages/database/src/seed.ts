import { hashPassword } from "better-auth/crypto";
import { prisma } from "./index.js";
import { seedEnv } from "./seed-env.js";

async function main() {
  const email = seedEnv.ADMIN_EMAIL;
  const password = seedEnv.ADMIN_PASSWORD;
  const name = seedEnv.ADMIN_NAME ?? "Admin";

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: {
      email,
      name,
      emailVerified: true,
      role: "ADMIN",
    },
  });

  // Upsert credential account for email/password login
  const hashedPassword = await hashPassword(password);
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

  console.log(`Seeded admin user: ${email} (role: ADMIN)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
