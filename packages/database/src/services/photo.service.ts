import type { Photo } from "../../generated/prisma/client";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../index";

export const DEFAULT_PAGE_SIZE = 50;

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

type RandomPhoto = { id: string; thumbnailUrl: string; blurHash: string };

// Two-tier dedup: prefix-6 first for visual diversity, fallback to exact blurHash
async function queryRandomPhotos(
  count: number,
  filter: Prisma.Sql = Prisma.empty
) {
  const photos = await prisma.$queryRaw<RandomPhoto[]>`
    SELECT id, "thumbnailUrl", "blurHash"
    FROM (
      SELECT DISTINCT ON (LEFT("blurHash", 6)) id, "thumbnailUrl", "blurHash"
      FROM "Photo"
      ${filter}
      ORDER BY LEFT("blurHash", 6), RANDOM()
    ) sub
    ORDER BY RANDOM()
    LIMIT ${count}
  `;

  if (photos.length >= count) {
    return photos;
  }

  return await prisma.$queryRaw<RandomPhoto[]>`
    SELECT id, "thumbnailUrl", "blurHash"
    FROM (
      SELECT DISTINCT ON ("blurHash") id, "thumbnailUrl", "blurHash"
      FROM "Photo"
      ${filter}
      ORDER BY "blurHash", RANDOM()
    ) sub
    ORDER BY RANDOM()
    LIMIT ${count}
  `;
}

export function getRandomPhotos(userId: string, count: number) {
  return queryRandomPhotos(count, Prisma.sql`WHERE "uploadedBy" = ${userId}`);
}

export function getAllRandomPhotos(count: number) {
  return queryRandomPhotos(count);
}

export async function getUserPhotoCount(userId: string) {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT LEFT("blurHash", 6)) as count
    FROM "Photo"
    WHERE "uploadedBy" = ${userId}
  `;
  return Number(result[0]?.count ?? 0);
}
