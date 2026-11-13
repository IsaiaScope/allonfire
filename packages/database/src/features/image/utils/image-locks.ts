import type { Prisma } from "../../../../generated/prisma/client";
import type { App, ImageAccess } from "../../../../generated/prisma/enums";
import type { ImageVisibility } from "../../auth/access/access";

/**
 * Locks the Images' rows until the transaction ends, in id order so two
 * writers never deadlock: two changes taking an Image out of different Apps
 * run one after the other, so the second sees what the first left.
 */
export const lockImages = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) => {
  await tx.$queryRaw`SELECT "id" FROM image."Image" WHERE "id" = ANY(${[...ids]}) ORDER BY "id" FOR UPDATE`;
};

/**
 * A locked Image's access and Apps, and the file its row names now.
 * @internal
 */
type ImagePlacement = ImageVisibility & { key: string };

/** Each locked Image's access, Apps and file name, by id. */
export type ImagePlacementsById = ReadonlyMap<string, ImagePlacement>;

/** The placements of the Image rows just locked, by id. */
export const placementsById = (
  rows: readonly {
    access: ImageAccess;
    apps: readonly { app: App }[];
    id: string;
    key: string;
  }[]
): ImagePlacementsById =>
  new Map(
    rows.map(({ access, apps, id, key }) => [
      id,
      { access, apps: apps.map(({ app }) => app), key },
    ])
  );
