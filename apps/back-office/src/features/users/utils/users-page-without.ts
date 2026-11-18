import { rowsWithout } from "@allonfire/core/features/next/query/utils/page-without";
import type { fetchUsers } from "./users-queries";

/** One page of the Users list, as the API answers it. */
export type UsersPage = Awaited<ReturnType<typeof fetchUsers>>;

/**
 * The page with the Users named by `ids` taken out, for a deletion shown
 * before the API answers (`rowsWithout`): the total and page count follow, at
 * `perPage` Users a page. A page that would be left empty while Users remain
 * elsewhere is returned as it is.
 */
export const usersPageWithout = (
  page: UsersPage,
  ids: ReadonlySet<string>,
  perPage: number
): UsersPage => {
  const rest = rowsWithout(page.users, page.total, ids, perPage);
  return rest
    ? {
        ...page,
        pageCount: rest.pageCount,
        total: rest.total,
        users: rest.rows,
      }
    : page;
};
