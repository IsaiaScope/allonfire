import { prisma } from "../index";
import { DEFAULT_PAGE_SIZE, type PhotoWithUser } from "./photo.service";

export async function toggleFavorite(
  photoId: string
): Promise<{ isFavorite: boolean }> {
  const existing = await prisma.favorite.findUnique({ where: { photoId } });

  if (existing) {
    await prisma.favorite.delete({ where: { photoId } });
    return { isFavorite: false };
  }

  await prisma.favorite.create({ data: { photoId } });
  return { isFavorite: true };
}

export async function getFavoritePhotoIds(
  photoIds: string[]
): Promise<Set<string>> {
  const favorites = await prisma.favorite.findMany({
    where: { photoId: { in: photoIds } },
    select: { photoId: true },
  });

  return new Set(favorites.map((f) => f.photoId));
}

export async function getFavoritesPaginated(
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<{ photos: PhotoWithUser[]; nextCursor: string | null }> {
  const favorites = await prisma.favorite.findMany({
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: {
      photo: {
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });

  const hasMore = favorites.length > limit;
  if (hasMore) {
    favorites.pop();
  }

  return {
    photos: favorites.map((f) => f.photo),
    nextCursor: hasMore ? (favorites.at(-1)?.id ?? null) : null,
  };
}
