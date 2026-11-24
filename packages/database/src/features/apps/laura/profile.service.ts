import { Prisma } from "../../../../generated/prisma/client";
import { App } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { lockFavorites } from "./utils/lock-favorites";

/** Postgres' code for a foreign key that points at nothing. */
const FOREIGN_KEY_VIOLATION = "23503";

/** A raw statement that failed on a foreign key (Prisma reports it as `P2010` with Postgres' code). */
const refusedByForeignKey = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2003" ||
    (error.code === "P2010" && error.meta?.code === FOREIGN_KEY_VIOLATION));

// `app` is left to its default (the database's own spelling of Laura, which
// Prisma's `App.LAURA` is not).
/**
 * Makes sure a User has their Laura Profile, with a copy of every Favorite on
 * the Admins' list. Created the first time they use Laura, never by the shared
 * user service. Answers true when they have one afterwards, and false (nothing
 * written) when they hold no Laura Membership, such as a revoked Member whose
 * Session cookie is still alive. Calling it again changes nothing.
 */
export async function ensureLauraProfile(userId: string): Promise<boolean> {
  // A Profile already there is whole (marks copy into every Profile under the
  // lock, and a new one copies the master under it) and rests on the
  // Membership (it goes with it), so every read after the first skips the
  // lock and its writes.
  const existing = await prisma.lauraProfile.findFirst({
    select: { userId: true },
    where: { userId },
  });
  if (existing) {
    return true;
  }
  return prisma.$transaction(async (tx) => {
    await lockFavorites(tx);
    const membership = await tx.membership.findUnique({
      where: { userId_app: { app: App.LAURA, userId } },
    });
    if (!membership) {
      return false;
    }
    try {
      await tx.$executeRaw`
        INSERT INTO laura."Profile" ("userId") VALUES (${userId})
        ON CONFLICT DO NOTHING
      `;
    } catch (error) {
      // The Membership went between the read and the write.
      if (refusedByForeignKey(error)) {
        return false;
      }
      throw error;
    }
    await tx.$executeRaw`
      INSERT INTO laura."ProfileFavorite" ("userId", "imageId", app, "createdAt")
      SELECT ${userId}, f."imageId", f.app, f."createdAt" FROM laura."Favorite" f
      ON CONFLICT DO NOTHING
    `;
    return true;
  });
}
