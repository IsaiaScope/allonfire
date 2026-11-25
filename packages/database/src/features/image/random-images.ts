import type { App } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import { visibleImages } from "./utils/image-filter";
import {
  type ImageRecord,
  toRecord,
  withPlacements,
} from "./utils/image-record";

/**
 * Up to `count` distinct Images placed in `app` and visible to someone who
 * enters `enterable` (ADR 0027), in a random order; fewer when the App holds
 * fewer, none for none. Reads the visible ids only, draws with a partial
 * Fisher-Yates from `random` (a test fixes it), then reads those rows.
 */
export async function randomImages({
  app,
  count,
  enterable,
  random = Math.random,
}: {
  app: App;
  count: number;
  enterable: readonly App[];
  random?: () => number;
}): Promise<ImageRecord[]> {
  const visible = await prisma.image.findMany({
    orderBy: { id: "asc" },
    select: { id: true },
    where: visibleImages({ app, enterable }),
  });
  const ids = visible.map(({ id }) => id);
  const drawn = Math.min(count, ids.length);
  for (let from = 0; from < drawn; from += 1) {
    const to = from + Math.floor(random() * (ids.length - from));
    const kept = ids[from] ?? "";
    ids[from] = ids[to] ?? "";
    ids[to] = kept;
  }
  const picked = ids.slice(0, drawn);
  const rows = await prisma.image.findMany({
    include: withPlacements,
    where: { id: { in: picked } },
  });
  const byId = new Map(rows.map((row) => [row.id, toRecord(row)]));
  return picked.flatMap((id) => byId.get(id) ?? []);
}
