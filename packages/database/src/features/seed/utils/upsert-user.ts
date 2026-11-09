import type { PrismaClient } from "../../../../generated/prisma/client";
import {
  replaceMemberships,
  setPasswordLogin,
} from "../../auth/utils/user-writes";
import type { SeedUser } from "./seed-user";

/**
 * Creates or updates a seeded User, its Memberships and its password login,
 * all or nothing. Prints nothing: the test-database CLI seeds a template on
 * its way to printing a URL a shell captures.
 */
export const upsertUser = (
  client: PrismaClient,
  { email, name, memberships }: SeedUser,
  hashedPassword: string
): Promise<void> =>
  client.$transaction(async (tx) => {
    const { id } = await tx.user.upsert({
      create: { email, emailVerified: true, name },
      update: {},
      where: { email },
    });
    // The listed Memberships are the whole truth for a seeded User.
    await replaceMemberships(tx, id, memberships);
    await setPasswordLogin(tx, id, hashedPassword);
  });
