import { prisma } from "../prisma/client";
import type { SeedUser } from "./seed-user";

/** Creates or updates a seeded User and its password login. */
export async function upsertUser(
  { email, name, role, allowedApps }: SeedUser,
  hashedPassword: string
) {
  const user = await prisma.user.upsert({
    create: { allowedApps, email, emailVerified: true, name, role },
    update: { allowedApps, role },
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
