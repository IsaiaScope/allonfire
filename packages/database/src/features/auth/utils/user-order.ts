import type { Direction } from "@allonfire/core/features/search/constants/search";
import type { SortItem } from "@allonfire/core/features/search/sort-query";
import type { Prisma } from "../../../../generated/prisma/client";

/** The columns a Users list sorts by (plain columns only, ADR 0031). */
export type UserSortColumn = "created" | "email";

/** What each sort column orders by. */
const USER_ORDER = {
  created: (direction) => ({ createdAt: direction }),
  email: (direction) => ({ email: direction }),
} as const satisfies Record<
  UserSortColumn,
  (direction: Direction) => Prisma.UserOrderByWithRelationInput
>;

/**
 * The sorts asked for, then `id` as the last tiebreak so a page never repeats
 * or skips a User; no sort is newest first.
 */
export const userOrderBy = (
  sort: readonly SortItem<UserSortColumn>[] = []
): Prisma.UserOrderByWithRelationInput[] => [
  ...(sort.length > 0
    ? sort.map(({ column, direction }) => USER_ORDER[column](direction))
    : [{ createdAt: "desc" as const }]),
  { id: "desc" },
];
