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

/** Makes `memberships` the User's whole set: every other one is removed. */
export const replaceMemberships = async (
  client: Prisma.TransactionClient,
  userId: string,
  memberships: readonly AccessMembership[]
): Promise<void> => {
  await client.membership.deleteMany({ where: { userId } });
  await client.membership.createMany({
    data: memberships.map(({ app, role }) => ({ app, role, userId })),
  });
};
