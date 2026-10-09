import { prisma } from "../prisma/client";
import type { SeedUser } from "./seed-user";

/** Creates or updates a seeded User, its Memberships and its password login. */
export async function upsertUser(
  { email, name, memberships }: SeedUser,
  hashedPassword: string
) {
  const user = await prisma.user.upsert({
    create: { email, emailVerified: true, name },
    update: {},
    where: { email },
  });

  // The listed Memberships are the whole truth for a seeded User.
  await prisma.$transaction([
    prisma.membership.deleteMany({ where: { userId: user.id } }),
    prisma.membership.createMany({
      data: memberships.map(({ app, role }) => ({
        app,
        role,
        userId: user.id,
      })),
    }),
  ]);

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
    `Seeded: ${email} (${memberships.map(({ app, role }) => `${app}: ${role}`).join(", ")})`
  );
}
