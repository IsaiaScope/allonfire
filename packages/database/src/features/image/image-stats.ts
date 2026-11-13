import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";

/** One App's Images by access: how many and their bytes together. */
type ImageAppStat = {
  app: App;
  privateBytes: number;
  privateCount: number;
  publicBytes: number;
  publicCount: number;
};
/**
 * Every Image once (`total`, `totalBytes`) and, per App that has any, its
 * bytes by access: an Image placed in two Apps counts in each App's row.
 */
export type ImageStats = {
  byApp: ImageAppStat[];
  total: number;
  totalBytes: number;
};

/**
 * What the Storage overview shows, whoever asks: the caller's right to see it
 * is the route's guard. The per-App rows fold the placements in memory, one
 * read of (App, access, bytes) triples; fine at this scale, a grouped SQL
 * query when the placements outgrow it.
 */
export async function imageStats(): Promise<ImageStats> {
  const [totals, placements] = await Promise.all([
    prisma.image.aggregate({ _count: true, _sum: { bytes: true } }),
    prisma.imageApp.findMany({
      select: { app: true, image: { select: { access: true, bytes: true } } },
    }),
  ]);
  const rows = new Map<App, ImageAppStat>();
  for (const { app, image } of placements) {
    const row = rows.get(app) ?? {
      app,
      privateBytes: 0,
      privateCount: 0,
      publicBytes: 0,
      publicCount: 0,
    };
    if (image.access === ImageAccess.PUBLIC) {
      row.publicBytes += image.bytes;
      row.publicCount += 1;
    } else {
      row.privateBytes += image.bytes;
      row.privateCount += 1;
    }
    rows.set(app, row);
  }
  return {
    byApp: objectValues(App).flatMap((app) => rows.get(app) ?? []),
    total: totals._count,
    totalBytes: totals._sum.bytes ?? 0,
  };
}
