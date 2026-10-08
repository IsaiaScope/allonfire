import type { Image, Prisma } from "../../../generated/prisma/client";
import { AllowedApp } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import { type ImageAlt, readAlt } from "./alt";

/** Where the last page ended: its last Image's sort key, not a row reference. */
export type ImageCursor = { createdAt: Date; id: string };

export type ImageRecord = Omit<Image, "alt"> & { alt: ImageAlt };
export type NewImage = Omit<ImageRecord, "id" | "createdAt">;
export type ImageChange = {
  id: string;
  app?: AllowedApp | undefined;
  alt?: ImageAlt | undefined;
};

export class ImageNotFoundError extends Error {
  readonly ids: string[];
  constructor(ids: string[]) {
    super(`Unknown Image ids: ${ids.join(", ")}`);
    this.name = "ImageNotFoundError";
    this.ids = ids;
  }
}

// `alt` is a Json column; parsing narrows it instead of casting.
const toRecord = (row: Image): ImageRecord => ({
  ...row,
  alt: readAlt(row.alt),
});

/** Throws unless every id exists; duplicates in `ids` count once. */
async function assertAllExist(
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) {
  const unique = [...new Set(ids)];
  const found = await tx.image.findMany({
    select: { id: true, key: true },
    where: { id: { in: unique } },
  });
  const foundIds = new Set(found.map(({ id }) => id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ImageNotFoundError(missing);
  }
  return found;
}

export async function createImages(images: NewImage[]): Promise<ImageRecord[]> {
  const rows = await prisma.$transaction(
    images.map((data) => prisma.image.create({ data }))
  );
  return rows.map(toRecord);
}

/**
 * The App's Images and the ALL ones, newest first. The cursor holds values,
 * not a row: deleting the Image it came from does not end the paging.
 */
export async function listImages({
  app,
  cursor,
  limit,
}: {
  app: AllowedApp;
  cursor?: ImageCursor | undefined;
  limit: number;
}): Promise<ImageRecord[]> {
  const rows = await prisma.image.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    where: {
      app: { in: [app, AllowedApp.ALL] },
      ...(cursor && {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      }),
    },
  });
  return rows.map(toRecord);
}

export async function getImage(id: string): Promise<ImageRecord | null> {
  const row = await prisma.image.findUnique({ where: { id } });
  return row && toRecord(row);
}

/** All or nothing: an unknown id rolls the whole batch back. */
export function updateImages(changes: ImageChange[]): Promise<ImageRecord[]> {
  return prisma.$transaction(async (tx) => {
    await assertAllExist(
      tx,
      changes.map(({ id }) => id)
    );
    const rows = await Promise.all(
      changes.map(({ id, app, alt }) =>
        tx.image.update({
          data: { ...(app && { app }), ...(alt && { alt }) },
          where: { id },
        })
      )
    );
    return rows.map(toRecord);
  });
}

/** All or nothing; returns the deleted keys so the caller removes the files. */
export function deleteImages(ids: string[]): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const found = await assertAllExist(tx, ids);
    await tx.image.deleteMany({ where: { id: { in: ids } } });
    return found.map(({ key }) => key);
  });
}
