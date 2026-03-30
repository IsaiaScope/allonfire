import type { Photo } from "../../generated/prisma/client";
import { prisma } from "../index";

const DEFAULT_PAGE_SIZE = 200;

export type PhotoWithUser = Photo & {
  user: { name: string | null; image: string | null };
};

export async function getPhotosPaginated(
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<{ photos: PhotoWithUser[]; nextCursor: string | null }> {
  const photos = await prisma.photo.findMany({
    take: limit + 1,
    orderBy: { id: "asc" },
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: { user: { select: { name: true, image: true } } },
  });

  const hasMore = photos.length > limit;
  if (hasMore) {
    photos.pop();
  }

  return {
    photos,
    nextCursor: hasMore ? (photos.at(-1)?.id ?? null) : null,
  };
}

export async function createPhoto(data: {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  blurHash: string;
  caption?: string;
  uploadedBy: string;
}) {
  return await prisma.photo.create({ data });
}

export async function deletePhoto(id: string) {
  return await prisma.photo.delete({ where: { id } });
}

export async function getPhotoCount() {
  return await prisma.photo.count();
}

export async function getRandomPhotos(userId: string, count: number) {
  return await prisma.$queryRaw<
    { id: string; thumbnailUrl: string; blurHash: string }[]
  >`
    SELECT id, "thumbnailUrl", "blurHash"
    FROM "Photo"
    WHERE "uploadedBy" = ${userId}
    ORDER BY RANDOM()
    LIMIT ${count}
  `;
}

export async function getUserPhotoCount(userId: string) {
  return await prisma.photo.count({ where: { uploadedBy: userId } });
}
