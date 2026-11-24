import type { Prisma } from "../../../../generated/prisma/client";
import type { AccessMembership } from "../access/access";
import { ACCOUNT } from "../constants/account";

/**
 * Gives the User the password login `hashedPassword`: their `credential`
 * Account updated, or created for a User who has none yet.
 */
export const setPasswordLogin = async (
  client: Prisma.TransactionClient,
  userId: string,
  hashedPassword: string
): Promise<void> => {
  // No compound unique on (userId, providerId): found, then written.
  const credential = await client.account.findFirst({
    select: { id: true },
    where: { providerId: ACCOUNT.PROVIDER.CREDENTIAL, userId },
  });
  await (credential
    ? client.account.update({
        data: { password: hashedPassword },
        where: { id: credential.id },
      })
    : client.account.create({
        data: {
          accountId: userId,
          password: hashedPassword,
          providerId: ACCOUNT.PROVIDER.CREDENTIAL,
          userId,
        },
      }));
};

/**
 * Makes `memberships` the User's whole set: every other one is removed. A
 * Membership kept is updated in place, never deleted and made again, since
 * an App's own rows hang from it (Laura's Profile, ADR 0034).
 */
export const replaceMemberships = async (
  client: Prisma.TransactionClient,
  userId: string,
  memberships: readonly AccessMembership[]
): Promise<void> => {
  await client.membership.deleteMany({
    where: { app: { notIn: memberships.map(({ app }) => app) }, userId },
  });
  await Promise.all(
    memberships.map(({ app, role }) =>
      client.membership.upsert({
        create: { app, role, userId },
        update: { role },
        where: { userId_app: { app, userId } },
      })
    )
  );
};
