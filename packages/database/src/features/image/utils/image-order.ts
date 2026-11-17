import type { Direction } from "@allonfire/core/features/search/constants/search";
import type { SortItem } from "@allonfire/core/features/search/sort-query";
import type { Prisma } from "../../../../generated/prisma/client";

/** The columns an Images list sorts by (plain columns only, ADR 0031). */
export type ImageSortColumn = "access" | "created" | "name" | "size";

/** What each sort column orders by. */
const IMAGE_ORDER = {
  access: (direction) => ({ access: direction }),
  created: (direction) => ({ createdAt: direction }),
  name: (direction) => ({ key: direction }),
  size: (direction) => ({ bytes: direction }),
} as const satisfies Record<
  ImageSortColumn,
  (direction: Direction) => Prisma.ImageOrderByWithRelationInput
>;

/**
 * The sorts asked for, then `id` as the last tiebreak so a page never repeats
 * or skips a row; no sort is newest upload first.
 */
export const imageOrderBy = (
  sort: readonly SortItem<ImageSortColumn>[] = []
): Prisma.ImageOrderByWithRelationInput[] => [
  ...(sort.length > 0
    ? sort.map(({ column, direction }) => IMAGE_ORDER[column](direction))
    : [{ createdAt: "desc" as const }]),
  { id: "desc" },
];
