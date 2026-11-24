import { API } from "@allonfire/api/shared/constants/api";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { retryUnlessRefused } from "@allonfire/core/features/next/query/utils/retry";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { USERS } from "../constants/users";
import type { UsersQuery } from "../constants/users-params";

/**
 * Asks once more after a server or network failure; never after the API
 * refused (a 401, 403 or 400), so the error shows at once.
 */
export const retryUsers = retryUnlessRefused(USERS.RETRIES);

/** One page of Users from the API; an error throws `DetailedError`. */
export const fetchUsers = (client: ApiClient, params: UsersQuery) =>
  parseResponse(
    client[API.VERSION.CURRENT][API.SEGMENT.BACK_OFFICE].users.$get({
      query: {
        [USER.PARAM.PAGE]: String(params[USER.PARAM.PAGE]),
        [USER.PARAM.PER_PAGE]: String(params[USER.PARAM.PER_PAGE]),
        [USER.PARAM.SEARCH]: params[USER.PARAM.SEARCH],
        [USER.PARAM.SORT]: params[USER.PARAM.SORT],
      },
    })
  );

/** One User from the API; an error throws `DetailedError`. */
export const fetchUser = (client: ApiClient, id: string) =>
  parseResponse(
    client[API.VERSION.CURRENT][API.SEGMENT.BACK_OFFICE].users[":id"].$get({
      param: { id },
    })
  );

/**
 * One page's key, tagged with the body it holds: the page hydrates under it,
 * so a wrong body or wrong params fail to compile, never a skipped hydration.
 */
export const usersPageKey = (params: UsersQuery) =>
  queryOptions<Awaited<ReturnType<typeof fetchUsers>>>({
    queryKey: QUERY.USERS.PAGE(params),
  }).queryKey;

/**
 * One page of Users. The page reads it on the server (`usersHydration`) and the
 * table reads it back under the same key, fresh as long as the browser keeps
 * the page's copy (`USERS.CACHE.LIFE.stale`): a shorter clock would read a
 * kept copy again the moment a link brings it back.
 */
export const usersQuery = (client: ApiClient, params: UsersQuery) =>
  queryOptions({
    queryFn: () => fetchUsers(client, params),
    queryKey: usersPageKey(params),
    retry: retryUsers,
    staleTime: USERS.CACHE.LIFE.stale * UNIT.MS_PER_SECOND,
  });

/**
 * One User's key, tagged with the body it holds: the page hydrates under it,
 * so a wrong body or wrong id fail to compile, never a skipped hydration.
 */
export const userKey = (id: string) =>
  queryOptions<Awaited<ReturnType<typeof fetchUser>>>({
    queryKey: QUERY.USERS.ONE(id),
  }).queryKey;

/**
 * One User, for their edit form. The page reads it on the server
 * (`userHydration`) and the form reads it back under the same key. Never
 * stale (`staleTime: "static"`, as the overviews'), so it is asked again only
 * by an action (`invalidateQueries`), never on a clock, a focus or a
 * reconnect: the form saves on the Version it opened with, and a newer one
 * read meanwhile would let a save overwrite a change the form never showed;
 * and a clock TanStack reads while the page prerenders blocks a soft
 * navigation to it.
 */
export const userQuery = (client: ApiClient, id: string) =>
  queryOptions({
    queryFn: () => fetchUser(client, id),
    queryKey: userKey(id),
    retry: retryUsers,
    staleTime: "static",
  });
