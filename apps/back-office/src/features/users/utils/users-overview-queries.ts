import { API } from "@allonfire/api/shared/constants/api";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { retryUsers } from "./users-queries";

/** The Users overview, as the API answers an Admin. */
export const fetchUsersOverview = (client: ApiClient) =>
  parseResponse(client[API.VERSION.CURRENT]["user-usage"].overview.$get());

type UsersOverview = Awaited<ReturnType<typeof fetchUsersOverview>>;

/**
 * The overview's key, tagged with the body it holds: the page hydrates under
 * it, so a wrong body fails to compile, never a skipped hydration.
 */
export const usersOverviewKey = queryOptions<UsersOverview>({
  queryKey: QUERY.USERS.OVERVIEW,
}).queryKey;

/**
 * The overview. The page reads it on the server (`usersOverviewHydration`,
 * kept under the Users' tag and life) and the view reads it back under the
 * same key. It is asked again only when a User change refreshed it (the Users
 * mutations invalidate `QUERY.USERS.ALL`), never on a clock: `"static"`, since
 * a number makes TanStack read the time while the page prerenders, and a time
 * read there blocks a navigation to the page.
 */
export const usersOverviewQuery = (client: ApiClient) =>
  queryOptions({
    queryFn: () => fetchUsersOverview(client),
    queryKey: usersOverviewKey,
    retry: retryUsers,
    staleTime: "static",
  });
