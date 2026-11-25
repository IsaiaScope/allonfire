import { App } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { lockFavorites } from "./utils/lock-favorites";
import { refusedByForeignKey } from "./utils/refused-by-foreign-key";

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
