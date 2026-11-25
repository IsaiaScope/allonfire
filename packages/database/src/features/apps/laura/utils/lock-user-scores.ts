import type { Prisma } from "../../../../../generated/prisma/client";

/**
 * Takes one User's scores lock for the rest of the transaction (released at
 * its end). A save reads the User's best game before it writes the new one,
 * so two saves at the same moment (a double click, a retry) would both read
 * the old best and both be told they beat it; under the lock the second reads
 * the first. The lock is keyed by the text, so it never meets another lock.
 */
export const lockUserScores = async (
  tx: Prisma.TransactionClient,
  userId: string
) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`memory-score:${userId}`}, 0))`;
};
