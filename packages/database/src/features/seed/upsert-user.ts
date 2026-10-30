import type { PrismaClient } from "../../../generated/prisma/client";
import type { SeedUser } from "./seed-user";

/**
 * Creates or updates a seeded User, its Memberships and its password login.
 * Prints nothing: the test-database CLI seeds a template on its way to
 * printing a URL a shell captures.
 */
export async function upsertUser(
  client: PrismaClient,
  { email, name, memberships }: SeedUser,
  hashedPassword: string
) {
  const user = await client.user.upsert({
    create: { email, emailVerified: true, name },
    update: {},
    where: { email },
  });

  // The listed Memberships are the whole truth for a seeded User.
  await client.$transaction([
    client.membership.deleteMany({ where: { userId: user.id } }),
    client.membership.createMany({
      data: memberships.map(({ app, role }) => ({
        app,
        role,
        userId: user.id,
      })),
    }),
  ]);

  const existingAccount = await client.account.findFirst({
    where: { providerId: "credential", userId: user.id },
  });

  if (existingAccount) {
    await client.account.update({
      data: { password: hashedPassword },
      where: { id: existingAccount.id },
    });
  } else {
    await client.account.create({
      data: {
        accountId: user.id,
        password: hashedPassword,
        providerId: "credential",
        userId: user.id,
      },
    });
  }
}
