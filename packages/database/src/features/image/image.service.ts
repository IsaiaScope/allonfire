import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import type { Image, Prisma } from "../../../generated/prisma/client";
import type { App, ImageAccess } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import { type ImageAlt, readAlt } from "./utils/alt";
import { visibleImages } from "./utils/image-filter";
import {
  type ImagePlacementsById,
  lockImages,
  placementsById,
} from "./utils/image-locks";
import { checkImageVersions, imageVersion } from "./utils/image-version";

export type { ImagePlacementsById } from "./utils/image-locks";

/**
 * An Image, its access and every App it is placed in, ordered by App
 * (ADR 0020, ADR 0027), and its Version.
 */
export type ImageRecord = Omit<Image, "alt"> & {
  alt: ImageAlt;
  apps: App[];
  /** Its Version (`imageVersion`): a change must carry it to be written. */
  version: string;
};
/** A new Image: private unless `access` says otherwise. */
export type NewImage = Omit<
  ImageRecord,
  "id" | "createdAt" | "updatedAt" | "access" | "version"
> & {
  access?: ImageAccess | undefined;
};
/** An Image a change names, and the Version the change was made on. */
export type OpenedImage = { id: string; version: string };
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
const withPlacements = {
  apps: { orderBy: { app: "asc" }, select: { app: true } },
} as const satisfies Prisma.ImageInclude;

type ImageRow = Prisma.ImageGetPayload<{ include: typeof withPlacements }>;

// `alt` is a Json column; parsing narrows it instead of casting.
const toRecord = (row: ImageRow): ImageRecord => {
  const record = {
    ...row,
    alt: readAlt(row.alt),
    apps: row.apps.map(({ app }) => app),
  };
  return { ...record, version: imageVersion(record) };
};

/** The Images among `ids` that exist, and the ids that do not; duplicates count once. */
async function findImages(
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) {
  const unique = [...new Set(ids)];
  const found = await tx.image.findMany({
    select: {
      access: true,
      alt: true,
      apps: withPlacements.apps,
      id: true,
      key: true,
      updatedAt: true,
    },
    where: { id: { in: unique } },
  });
  const foundIds = new Set(found.map(({ id }) => id));
  return { found, missing: unique.filter((id) => !foundIds.has(id)) };
}

/**
 * The caller's check on a delete, run inside its transaction against the
 * placements just locked (only the Images that exist): it throws to refuse,
 * and nothing is written; otherwise it answers the ids it lets through. An id
 * it leaves out is one the caller cannot act on as if it were not there
 * (unknown, or not theirs to see), so it is skipped, never told apart from
 * one that does not exist. A placement added after the caller's own read is
 * seen, so it is checked too.
 */
export type AuthorisePlacements = (
  placements: ImagePlacementsById
) => Iterable<string>;

/**
 * The caller's changes, worked out inside the transaction against the
 * placements just locked, the same way `AuthorisePlacements` checks a delete: it
 * throws to refuse, and nothing is written.
 */
export type ResolveChanges = (placements: ImagePlacementsById) => ImageChange[];

/**
 * Locks the Images, throws unless every one exists (duplicates count once), then runs `check` on
 * their placements; returns the rows and what `check` returned.
 */
const lockedAndChecked = async <T>(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
  check: (placements: ImagePlacementsById) => T
) => {
  await lockImages(tx, ids);
  const { found, missing } = await findImages(tx, ids);
  if (missing.length > 0) {
    throw new ImageNotFoundError(missing);
  }
  return { checked: check(placementsById(found)), found };
};

/**
 * Locks the Images that exist (an unknown id is skipped, not an error), runs
 * `authorise` on their placements and returns the rows it lets through.
 */
const lockedAndAllowed = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[],
  authorise: AuthorisePlacements
) => {
  await lockImages(tx, ids);
  const { found } = await findImages(tx, ids);
  const allowed = new Set(authorise(placementsById(found)));
  return found.filter(({ id }) => allowed.has(id));
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
        include: withPlacements,
      })
    )
  );
  return rows.map(toRecord);
}

/**
 * A numbered page of the Images visible to someone who enters `enterable`:
 * public, or in an App they enter (ADR 0027). Narrowed to those placed in
 * `app`, in any of `apps`, with any of the `accesses` given, and, when `text`
 * is given, whose alt text (in any Language) or file name holds it, ignoring
 * case; each narrowing given applies on top of the others. Newest upload first, with how many there are and
 * their bytes together, whatever the page. Three reads, not a transaction:
 * under READ COMMITTED each takes its own snapshot either way.
 */
export async function listImagesPage({
  accesses,
  app,
  apps,
  enterable,
  page,
  perPage,
  text,
}: {
  accesses?: readonly ImageAccess[] | undefined;
  app?: App | undefined;
  apps?: readonly App[] | undefined;
  enterable: readonly App[];
  page: number;
  perPage: number;
  text?: string | undefined;
}): Promise<{ images: ImageRecord[]; total: number; totalBytes: number }> {
  const where = visibleImages({ accesses, app, apps, enterable, text });
  const [totals, rows] = await Promise.all([
    prisma.image.aggregate({ _count: true, _sum: { bytes: true }, where }),
    prisma.image.findMany({
      include: withPlacements,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      where,
    }),
  ]);
  return {
    images: rows.map(toRecord),
    total: totals._count,
    totalBytes: totals._sum.bytes ?? 0,
  };
}

export async function getImage(id: string): Promise<ImageRecord | null> {
  const row = await prisma.image.findUnique({
    include: withPlacements,
    where: { id },
  });
  return row && toRecord(row);
}

/**
 * One change, its statements in order: take out, then place or switch. Any
 * change moves the Image's `updatedAt`, an App-only one too, so every change
 * is a new Version.
 */
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
  if (alt || access || key || place.length > 0 || remove.length > 0) {
    await tx.image.update({
      data: {
        updatedAt: new Date(),
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
 * Writes what `resolve` works out from the placements of the `opened`
 * Images, locked; the Images come back in the order of its changes. All or
 * nothing: an unknown id (before `resolve` runs) throws `ImageNotFoundError`;
 * an Image changed since the Version it was opened on (checked after
 * `resolve`, before any write), or one the batch would leave in no App,
 * throws `ResourceChangedError`, and nothing is written. One change at a
 * time (a reduce chain): a batch may name the same Image twice, and its
 * changes apply in order.
 */
export function updateImages(
  opened: readonly OpenedImage[],
  resolve: ResolveChanges
): Promise<ImageRecord[]> {
  const ids = opened.map(({ id }) => id);
  return prisma.$transaction(async (tx) => {
    const { checked: changes, found } = await lockedAndChecked(
      tx,
      ids,
      resolve
    );
    // After the caller's checks, so a refusal never tells an Image exists
    // that the caller cannot see.
    checkImageVersions(opened, found);
    await changes.reduce<Promise<void>>(async (done, change) => {
      await done;
      await applyChange(tx, change);
    }, Promise.resolve());
    // One read once every change is in, back in the order asked.
    const rows = await tx.image.findMany({
      include: withPlacements,
      where: { id: { in: [...ids] } },
    });
    // A batch whose changes take an Image out of every App must not leave a
    // row nobody sees and nobody can delete: throwing rolls it all back. The
    // Image exists, another change took it out of its other Apps first.
    const emptied = rows.filter(({ apps }) => apps.length === 0);
    if (emptied.length > 0) {
      throw new ResourceChangedError(emptied.map(({ id }) => id));
    }
    const byId = new Map(rows.map((row) => [row.id, toRecord(row)]));
    return changes.flatMap(({ id }) => byId.get(id) ?? []);
  });
}

/**
 * Takes the Images out of `app` and deletes those left in no App; answers how
 * many it acted on and the keys of those deleted, so the caller removes the
 * files. An Image still placed elsewhere keeps its row and its file. An id
 * `authorise` leaves out (unknown, or not placed in `app`) is skipped; a
 * refusal writes nothing.
 */
export function removeImagesFromApp(
  ids: readonly string[],
  app: App,
  authorise: AuthorisePlacements
): Promise<{ deleted: number; keys: string[] }> {
  return prisma.$transaction(async (tx) => {
    const rows = await lockedAndAllowed(tx, ids, authorise);
    const acted = rows.map(({ id }) => id);
    await tx.imageApp.deleteMany({ where: { app, imageId: { in: acted } } });
    const orphans = await tx.image.findMany({
      select: { id: true, key: true },
      where: { apps: { none: {} }, id: { in: acted } },
    });
    await tx.image.deleteMany({
      where: { id: { in: orphans.map(({ id }) => id) } },
    });
    return { deleted: acted.length, keys: orphans.map(({ key }) => key) };
  });
}

/**
 * Deletes the Images everywhere; answers how many and their keys, so the
 * caller removes the files. An id `authorise` leaves out (unknown, or not the
 * caller's to see) is skipped as already gone; a refusal writes nothing.
 */
export function deleteImages(
  ids: string[],
  authorise: AuthorisePlacements
): Promise<{ deleted: number; keys: string[] }> {
  return prisma.$transaction(async (tx) => {
    const rows = await lockedAndAllowed(tx, ids, authorise);
    await tx.image.deleteMany({
      where: { id: { in: rows.map(({ id }) => id) } },
    });
    return { deleted: rows.length, keys: rows.map(({ key }) => key) };
  });
}
