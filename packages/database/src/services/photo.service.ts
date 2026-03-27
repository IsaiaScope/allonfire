import type { Photo } from "../../generated/prisma/client";
import { prisma } from "../index";

const DEFAULT_PAGE_SIZE = 20;

export type PhotoWithUser = Photo & {
  user: { name: string | null; image: string | null };
};

export async function getPhotosPaginated(
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<{ photos: PhotoWithUser[]; nextCursor: string | null }> {
  const photos = await prisma.photo.findMany({
    take: limit + 1,
    orderBy: { createdAt: "desc" },
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
