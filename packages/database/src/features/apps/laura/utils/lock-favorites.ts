import type { Prisma } from "../../../../../generated/prisma/client";
import { LAURA_FAVORITE } from "../constants/laura-favorite";

/**
 * Takes Laura's Favorites lock for the rest of the transaction (released at its
 * end). Marking, clearing and creating a Profile run one after the other, so a
 * new Profile always copies a master list nobody is half way through changing,
 * and a mark always reaches every Profile that exists when it commits. About 20
 * Users make the wait nothing; a per-App lock is the way up if an App grows.
 */
export const lockFavorites = async (tx: Prisma.TransactionClient) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LAURA_FAVORITE.LOCK_KEY}::bigint)`;
};
