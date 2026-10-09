import type { Image, Prisma } from "../../../generated/prisma/client";
import type { App } from "../../../generated/prisma/enums";
import type { ImageLink } from "../auth/access/access";
import { prisma } from "../prisma/client";
import { type ImageAlt, readAlt } from "./alt";

/** Where the last page ended: its last Image's sort key, not a row reference. */
export type ImageCursor = { createdAt: Date; id: string };

/** An Image and every App it is placed in, ordered by App (ADR 0020). */
export type ImageRecord = Omit<Image, "alt"> & {
  alt: ImageAlt;
  apps: ImageLink[];
};
export type NewImage = Omit<ImageRecord, "id" | "createdAt">;
export type ImageChange = {
  id: string;
  /**
   * Placements to add or switch, worked out against what the caller read: a
   * placement nobody names is left alone, so one added since survives.
   */
  place?: ImageLink[] | undefined;
  /** Apps to take the Image out of; emptying an Image this way throws. */
  remove?: App[] | undefined;
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

/** Every read brings the Image's placements, ordered by App. */
const withLinks = {
  apps: { orderBy: { app: "asc" }, select: { app: true, public: true } },
} as const satisfies Prisma.ImageInclude;

type ImageRow = Prisma.ImageGetPayload<{ include: typeof withLinks }>;

// `alt` is a Json column; parsing narrows it instead of casting.
const toRecord = (row: ImageRow): ImageRecord => ({
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
    select: { apps: withLinks.apps, id: true, key: true },
    where: { id: { in: unique } },
  });
  const foundIds = new Set(found.map(({ id }) => id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ImageNotFoundError(missing);
  }
  return found;
}

/**
 * Locks the Images' rows until the transaction ends, in id order so two
 * writers never deadlock: two changes taking an Image out of different Apps
 * run one after the other, so the second sees what the first left.
 */
const lockImages = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) => {
  await tx.$queryRaw`SELECT "id" FROM image."Image" WHERE "id" = ANY(${[...ids]}) ORDER BY "id" FOR UPDATE`;
};

/**
 * Throws unless every Image keeps a placement: a change worked out against a
 * stale read (another Admin took the Image out of an App since) must not leave
 * a row nobody sees and nobody can delete. The caller reads it again.
 */
const assertNoneEmptied = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) => {
  const emptied = await tx.image.findMany({
    select: { id: true },
    where: { apps: { none: {} }, id: { in: [...ids] } },
  });
  if (emptied.length > 0) {
    throw new ImageNotFoundError(emptied.map(({ id }) => id));
  }
};

/** Each Image's placements, by id. */
export type ImageLinksById = ReadonlyMap<string, readonly ImageLink[]>;

/**
 * The caller's check on a delete, run inside its transaction against the
 * placements just locked: it throws to refuse, and nothing is written. A
 * placement added after the caller's own read is seen, so it is checked too.
 */
export type AuthoriseLinks = (links: ImageLinksById) => void;

/** Locks the Images, throws unless every one exists, then runs the caller's check. */
const lockedAndAuthorised = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[],
  authorise: AuthoriseLinks
) => {
  await lockImages(tx, ids);
  const found = await assertAllExist(tx, ids);
  authorise(new Map(found.map(({ apps, id }) => [id, apps])));
  return found;
};

/** Each Image with its placements, all in one transaction. */
export async function createImages(images: NewImage[]): Promise<ImageRecord[]> {
  const rows = await prisma.$transaction(
    images.map(({ apps, ...data }) =>
      prisma.image.create({
        data: { ...data, apps: { create: apps } },
        include: withLinks,
      })
    )
  );
  return rows.map(toRecord);
}

/**
 * The Images visible in `app` (in any App when it is left out) to someone
 * who enters `enterable`: placed there, and that same placement public or in
 * an App they enter. Newest upload first, not the date it entered the App, so
 * the cursor keeps one shape; the cursor holds values, not a row, so
 * deleting the Image it came from does not end the paging.
 */
export async function listImages({
  app,
  cursor,
  enterable,
  limit,
}: {
  app?: App | undefined;
  cursor?: ImageCursor | undefined;
  enterable: readonly App[];
  limit: number;
}): Promise<ImageRecord[]> {
  const rows = await prisma.image.findMany({
    include: withLinks,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    where: {
      apps: {
        some: {
          ...(app && { app }),
          OR: [{ public: true }, { app: { in: [...enterable] } }],
        },
      },
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

/** Each Image's placements, by id; throws `ImageNotFoundError` unless every id exists. */
export async function linksOfImages(
  ids: readonly string[]
): Promise<Map<string, ImageLink[]>> {
  const found = await assertAllExist(prisma, ids);
  return new Map(found.map(({ apps, id }) => [id, apps]));
}

export async function getImage(id: string): Promise<ImageRecord | null> {
  const row = await prisma.image.findUnique({
    include: withLinks,
    where: { id },
  });
  return row && toRecord(row);
}

/** One change, its statements in order: take out, then place or switch. */
const applyChange = async (
  tx: Prisma.TransactionClient,
  { alt, id, place = [], remove = [] }: ImageChange
) => {
  if (remove.length > 0) {
    await tx.imageApp.deleteMany({
      where: { app: { in: remove }, imageId: id },
    });
  }
  await Promise.all(
    place.map((link) =>
      tx.imageApp.upsert({
        create: { ...link, imageId: id },
        update: { public: link.public },
        where: { imageId_app: { app: link.app, imageId: id } },
      })
    )
  );
  if (alt) {
    await tx.image.update({
      data: { alt },
      select: { id: true },
      where: { id },
    });
  }
};

/**
 * All or nothing: an unknown id, or an Image the batch would leave in no App,
 * rolls the whole batch back with `ImageNotFoundError`. One change at a
 * time (a reduce chain): a batch may name the same Image twice, and its
 * changes apply in order.
 */
export function updateImages(changes: ImageChange[]): Promise<ImageRecord[]> {
  const ids = changes.map(({ id }) => id);
  return prisma.$transaction(async (tx) => {
    await lockImages(tx, ids);
    await assertAllExist(tx, ids);
    await changes.reduce<Promise<void>>(async (done, change) => {
      await done;
      await applyChange(tx, change);
    }, Promise.resolve());
    await assertNoneEmptied(tx, ids);
    // One read once every change is in, back in the order asked.
    const rows = await tx.image.findMany({
      include: withLinks,
      where: { id: { in: ids } },
    });
    const byId = new Map(rows.map((row) => [row.id, toRecord(row)]));
    return changes.flatMap(({ id }) => byId.get(id) ?? []);
  });
}

/**
 * Takes the Images out of `app`, all or nothing, and deletes those left in no
 * App; returns their keys so the caller removes the files. An Image still
 * placed elsewhere keeps its row and its file.
 */
export function removeImagesFromApp(
  ids: readonly string[],
  app: App,
  authorise: AuthoriseLinks
): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    await lockedAndAuthorised(tx, ids, authorise);
    await tx.imageApp.deleteMany({ where: { app, imageId: { in: [...ids] } } });
    const orphans = await tx.image.findMany({
      select: { id: true, key: true },
      where: { apps: { none: {} }, id: { in: [...ids] } },
    });
    await tx.image.deleteMany({
      where: { id: { in: orphans.map(({ id }) => id) } },
    });
    return orphans.map(({ key }) => key);
  });
}

/** All or nothing, everywhere; returns the deleted keys so the caller removes the files. */
export function deleteImages(
  ids: string[],
  authorise: AuthoriseLinks
): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const found = await lockedAndAuthorised(tx, ids, authorise);
    await tx.image.deleteMany({ where: { id: { in: ids } } });
    return found.map(({ key }) => key);
  });
}
