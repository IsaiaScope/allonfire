import type { Image, Prisma } from "../../../generated/prisma/client";
import { type App, ImageAccess } from "../../../generated/prisma/enums";
import type { ImageVisibility } from "../auth/access/access";
import { prisma } from "../prisma/client";
import { type ImageAlt, readAlt } from "./alt";

/** Where the last page ended: its last Image's sort key, not a row reference. */
export type ImageCursor = { createdAt: Date; id: string };

/**
 * An Image, its access and every App it is placed in, ordered by App
 * (ADR 0020, ADR 0027).
 */
export type ImageRecord = Omit<Image, "alt"> & {
  alt: ImageAlt;
  apps: App[];
};
/** A new Image: private unless `access` says otherwise. */
export type NewImage = Omit<ImageRecord, "id" | "createdAt" | "access"> & {
  access?: ImageAccess | undefined;
};
export type ImageChange = {
  id: string;
  /** Apps to place it in; one it is already in is left alone. */
  place?: App[] | undefined;
  /** Apps to take the Image out of; emptying an Image this way throws. */
  remove?: App[] | undefined;
  alt?: ImageAlt | undefined;
  /** Public or private, in every App it is in (ADR 0027). */
  access?: ImageAccess | undefined;
  /**
   * The file's new name, written with `access` in one transaction: a public
   * Image made private moves to a copy, so its never-expiring links die.
   */
  key?: string | undefined;
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
  apps: { orderBy: { app: "asc" }, select: { app: true } },
} as const satisfies Prisma.ImageInclude;

type ImageRow = Prisma.ImageGetPayload<{ include: typeof withLinks }>;

// `alt` is a Json column; parsing narrows it instead of casting.
const toRecord = (row: ImageRow): ImageRecord => ({
  ...row,
  alt: readAlt(row.alt),
  apps: row.apps.map(({ app }) => app),
});

/** Throws unless every id exists; duplicates in `ids` count once. */
async function assertAllExist(
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) {
  const unique = [...new Set(ids)];
  const found = await tx.image.findMany({
    select: { access: true, apps: withLinks.apps, id: true, key: true },
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

/** A locked Image's access and Apps, and the file its row names now. */
export type ImageLink = ImageVisibility & { key: string };

/** Each locked Image's access, Apps and file name, by id. */
export type ImageLinksById = ReadonlyMap<string, ImageLink>;

/**
 * The caller's check on a delete, run inside its transaction against the
 * placements just locked: it throws to refuse, and nothing is written. A
 * placement added after the caller's own read is seen, so it is checked too.
 */
export type AuthoriseLinks = (links: ImageLinksById) => void;

/**
 * The caller's changes, worked out inside the transaction against the
 * placements just locked, the same way `AuthoriseLinks` checks a delete: it
 * throws to refuse, and nothing is written.
 */
export type ResolveChanges = (links: ImageLinksById) => ImageChange[];

/**
 * Locks the Images, throws unless every one exists, then runs `check` on
 * their placements; returns the rows and what `check` returned.
 */
const lockedAndChecked = async <T>(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
  check: (links: ImageLinksById) => T
) => {
  await lockImages(tx, ids);
  const found = await assertAllExist(tx, ids);
  return {
    checked: check(
      new Map(
        found.map(({ access, apps, id, key }) => [
          id,
          { access, apps: apps.map(({ app }) => app), key },
        ])
      )
    ),
    found,
  };
};

/** Each Image with its placements, all in one transaction. */
export async function createImages(images: NewImage[]): Promise<ImageRecord[]> {
  const rows = await prisma.$transaction(
    images.map(({ access, apps, ...data }) =>
      prisma.image.create({
        data: {
          ...data,
          ...(access && { access }),
          apps: { create: apps.map((app) => ({ app })) },
        },
        include: withLinks,
      })
    )
  );
  return rows.map(toRecord);
}

/**
 * The Images visible in `app` (in any App when it is left out) to someone
 * who enters `enterable`: placed there, and public or in an App they enter
 * (ADR 0027). Newest upload first, not the date it entered the App, so
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
      AND: [
        ...(app ? [{ apps: { some: { app } } }] : []),
        {
          OR: [
            { access: ImageAccess.PUBLIC },
            { apps: { some: { app: { in: [...enterable] } } } },
          ],
        },
      ],
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
  const row = await prisma.image.findUnique({
    include: withLinks,
    where: { id },
  });
  return row && toRecord(row);
}

/** One change, its statements in order: take out, then place or switch. */
const applyChange = async (
  tx: Prisma.TransactionClient,
  { access, alt, id, key, place = [], remove = [] }: ImageChange
) => {
  if (remove.length > 0) {
    await tx.imageApp.deleteMany({
      where: { app: { in: remove }, imageId: id },
    });
  }
  if (place.length > 0) {
    await tx.imageApp.createMany({
      data: place.map((app) => ({ app, imageId: id })),
      skipDuplicates: true,
    });
  }
  if (alt || access || key) {
    await tx.image.update({
      data: {
        ...(alt && { alt }),
        ...(access && { access }),
        ...(key && { key }),
      },
      select: { id: true },
      where: { id },
    });
  }
};

/**
 * Writes what `resolve` works out from the placements of `ids`, locked; the
 * Images come back in the order of its changes. All or nothing: an unknown
 * id (before `resolve` runs), or an Image the batch would leave in no App,
 * rolls the whole batch back with `ImageNotFoundError`. One change at a
 * time (a reduce chain): a batch may name the same Image twice, and its
 * changes apply in order.
 */
export function updateImages(
  ids: readonly string[],
  resolve: ResolveChanges
): Promise<ImageRecord[]> {
  return prisma.$transaction(async (tx) => {
    const { checked: changes } = await lockedAndChecked(tx, ids, resolve);
    await changes.reduce<Promise<void>>(async (done, change) => {
      await done;
      await applyChange(tx, change);
    }, Promise.resolve());
    // One read once every change is in, back in the order asked.
    const rows = await tx.image.findMany({
      include: withLinks,
      where: { id: { in: [...ids] } },
    });
    // A batch whose changes take an Image out of every App must not leave a
    // row nobody sees and nobody can delete: throwing rolls it all back.
    const emptied = rows.filter(({ apps }) => apps.length === 0);
    if (emptied.length > 0) {
      throw new ImageNotFoundError(emptied.map(({ id }) => id));
    }
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
    await lockedAndChecked(tx, ids, authorise);
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
    const { found } = await lockedAndChecked(tx, ids, authorise);
    await tx.image.deleteMany({ where: { id: { in: ids } } });
    return found.map(({ key }) => key);
  });
}

/**
 * Points the Image at a new file name, the old file still in the bucket; the
 * caller copied it first and deletes the old one after. Making a public
 * Image private does this, so its never-expiring links stop at once.
 */
export async function renameImageKey(id: string, key: string): Promise<void> {
  await prisma.image.update({
    data: { key },
    select: { id: true },
    where: { id },
  });
}
