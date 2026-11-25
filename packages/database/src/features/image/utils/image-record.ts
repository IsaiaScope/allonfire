import type { Image, Prisma } from "../../../../generated/prisma/client";
import type { App } from "../../../../generated/prisma/enums";
import { type ImageAlt, readAlt } from "./alt";
import { imageVersion } from "./image-version";

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

/** Every read brings the Image's placements, ordered by App. */
export const withPlacements = {
  apps: { orderBy: { app: "asc" }, select: { app: true } },
} as const satisfies Prisma.ImageInclude;

type ImageRow = Prisma.ImageGetPayload<{ include: typeof withPlacements }>;

// `alt` is a Json column; parsing narrows it instead of casting.
export const toRecord = (row: ImageRow): ImageRecord => {
  const record = {
    ...row,
    alt: readAlt(row.alt),
    apps: row.apps.map(({ app }) => app),
  };
  return { ...record, version: imageVersion(record) };
};
