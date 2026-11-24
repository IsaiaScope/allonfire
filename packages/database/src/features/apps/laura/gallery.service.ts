import type { KeysetPosition } from "@allonfire/core/features/search/keyset-cursor";
import type { ImageAccess } from "../../../../generated/prisma/enums";
import { App } from "../../../../generated/prisma/enums";
import { type ImageAlt, readAlt } from "../../image/utils/alt";
import { prisma } from "../../prisma/client";

/** An Image of Laura as a screen shows it, with the caller's own Favorite flag. */
export type GalleryRecord = {
  access: ImageAccess;
  alt: ImageAlt;
  blurDataUrl: string;
  /** True when the caller's own copy of the Favorite exists. */
  favorite: boolean;
  height: number;
  id: string;
  key: string;
  width: number;
};

/** One page, and where the next one starts (null on the last). */
export type GalleryPage = {
  images: GalleryRecord[];
  next: KeysetPosition | null;
};

type PageArgs = {
  after?: KeysetPosition | undefined;
  limit: number;
  userId: string;
};

const imageSelect = {
  access: true,
  alt: true,
  blurDataUrl: true,
  createdAt: true,
  height: true,
  id: true,
  key: true,
  width: true,
} as const;

/** A row past `limit` only proves another page exists: it is cut and the page's last row is the cursor. */
const toPage = <Row>(
  rows: Row[],
  limit: number,
  positionOf: (row: Row) => KeysetPosition
): { page: Row[]; next: KeysetPosition | null } => {
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    next: rows.length > limit && last ? positionOf(last) : null,
    page,
  };
};

/**
 * The Images placed in Laura, newest first, `limit` at a time. `favorite` is
 * read from the caller's own copies, so a User with no Profile yet sees none
 * marked. Paged by keyset (`createdAt`, then id), so an Image added or removed
 * between two pages never repeats or skips one.
 */
export async function listGalleryPage({
  after,
  limit,
  userId,
}: PageArgs): Promise<GalleryPage> {
  const rows = await prisma.image.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      ...imageSelect,
      apps: {
        select: {
          profileFavorites: { select: { imageId: true }, where: { userId } },
        },
        where: { app: App.LAURA },
      },
    },
    take: limit + 1,
    where: {
      apps: { some: { app: App.LAURA } },
      ...(after && {
        OR: [
          { createdAt: { lt: after.at } },
          { createdAt: after.at, id: { lt: after.id } },
        ],
      }),
    },
  });
  const { next, page } = toPage(rows, limit, ({ createdAt, id }) => ({
    at: createdAt,
    id,
  }));
  return {
    images: page.map(({ alt, apps, createdAt: _at, ...image }) => ({
      ...image,
      alt: readAlt(alt),
      favorite: apps.some(
        ({ profileFavorites }) => profileFavorites.length > 0
      ),
    })),
    next,
  };
}

/**
 * The caller's own Favorites, most recently marked first (the copy keeps the
 * master's `createdAt`, so every User reads the same order), `limit` at a
 * time. Empty for a User with no Profile yet. Paged by keyset (copy time, then
 * Image id).
 */
export async function listFavoritesPage({
  after,
  limit,
  userId,
}: PageArgs): Promise<GalleryPage> {
  const rows = await prisma.profileFavorite.findMany({
    orderBy: [{ createdAt: "desc" }, { imageId: "desc" }],
    select: {
      createdAt: true,
      imageApp: { select: { image: { select: imageSelect } } },
      imageId: true,
    },
    take: limit + 1,
    where: {
      userId,
      ...(after && {
        OR: [
          { createdAt: { lt: after.at } },
          { createdAt: after.at, imageId: { lt: after.id } },
        ],
      }),
    },
  });
  const { next, page } = toPage(rows, limit, ({ createdAt, imageId }) => ({
    at: createdAt,
    id: imageId,
  }));
  return {
    images: page.map(({ imageApp }) => {
      const { alt, createdAt: _at, ...image } = imageApp.image;
      return { ...image, alt: readAlt(alt), favorite: true };
    }),
    next,
  };
}
