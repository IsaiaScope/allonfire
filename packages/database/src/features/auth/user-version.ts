import { versionOf } from "@allonfire/core/features/version/utils/version-of";
import type { Prisma } from "../../../generated/prisma/client";
import type { AccessMembership } from "./access/access";

/** What a User's Version covers: what an edit could overwrite. */
export type VersionedUser = {
  updatedAt: Date;
  memberships: readonly AccessMembership[];
};

/**
 * A User's Version: their row's last change and every (App, Role) they hold.
 * A Membership has no timestamp of its own, and one removed elsewhere leaves
 * no row, so the pairs themselves are hashed; sorted, so their order never
 * counts.
 */
export const userVersion = ({ updatedAt, memberships }: VersionedUser) =>
  versionOf(
    updatedAt.toISOString(),
    ...memberships.map(({ app, role }) => `${app}:${role}`).sort()
  );

/**
 * Locks the User's row till the transaction ends, then reads their picture
 * and their Version; null for an unknown id. A Membership written elsewhere
 * (a join) waits too: its foreign key check locks this row (`FOR KEY
 * SHARE`), so it lands before the read or after the transaction, never
 * between.
 */
export const lockUser = async (tx: Prisma.TransactionClient, id: string) => {
  const [locked] = await tx.$queryRaw<
    { image: string | null; updatedAt: Date }[]
  >`SELECT "image", "updatedAt" FROM auth."User" WHERE "id" = ${id} FOR UPDATE`;
  if (!locked) {
    return null;
  }
  const memberships = await tx.membership.findMany({
    select: { app: true, role: true },
    where: { userId: id },
  });
  return {
    image: locked.image,
    version: userVersion({ memberships, updatedAt: locked.updatedAt }),
  };
};
