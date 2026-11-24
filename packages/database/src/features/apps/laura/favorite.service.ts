import { App } from "../../../../generated/prisma/enums";
import { lockImages } from "../../image/utils/image-locks";
import { prisma } from "../../prisma/client";
import { lockFavorites } from "./utils/lock-favorites";

/**
 * Marks an Image of Laura as a Favorite: the Admins' one list, and a copy in
 * every Laura Profile that exists, in one transaction. Answers true once it is
 * one, and false when the Image is not placed in Laura (nothing is written).
 * Marking again changes nothing: the first `createdAt` stays, and a copy keeps
 * the master's, so every User's Favorites are in the same order. The Image's
 * row is locked first, as a removal does: a removal that commits meanwhile is
 * seen (false), never a foreign key error.
 */
export function markFavorite(imageId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await lockFavorites(tx);
    await lockImages(tx, [imageId]);
    const placed = await tx.imageApp.findUnique({
      where: { imageId_app: { app: App.LAURA, imageId } },
    });
    if (!placed) {
      return false;
    }
    // An empty `update` writes nothing, so the first `createdAt` stays.
    await tx.favorite.upsert({
      create: { imageId },
      update: {},
      where: { imageId },
    });
    await tx.$executeRaw`
      INSERT INTO laura."ProfileFavorite" ("userId", "imageId", app, "createdAt")
      SELECT p."userId", f."imageId", f.app, f."createdAt"
      FROM laura."Profile" p CROSS JOIN laura."Favorite" f
      WHERE f."imageId" = ${imageId}
      ON CONFLICT DO NOTHING
    `;
    return true;
  });
}

/** Clears a Favorite from the master and every Profile; an Image that is not one is no error. */
export function unmarkFavorite(imageId: string): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await lockFavorites(tx);
    await tx.profileFavorite.deleteMany({ where: { imageId } });
    await tx.favorite.deleteMany({ where: { imageId } });
  });
}
