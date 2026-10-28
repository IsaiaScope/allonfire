import { API } from "@allonfire/api/shared/constants/api";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { queryOptions } from "@tanstack/react-query";
import { DetailedError, parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { USERS } from "../constants/users";
import type { UsersParams } from "../constants/users-params";

/**
 * Asks once more after a server or network failure; never after the API
 * refused (a 401, 403 or 400), so the error shows at once.
 */
export const retryUsers = (failureCount: number, error: unknown) =>
  failureCount < USERS.RETRIES &&
  !(
    error instanceof DetailedError &&
    typeof error.statusCode === "number" &&
    // Below a server error, the request was at fault: asking again changes nothing.
    error.statusCode < HTTP.STATUS.INTERNAL_SERVER_ERROR
  );

/** One page of Users from the API; an error throws `DetailedError`. */
export const fetchUsers = (client: ApiClient, params: UsersParams) =>
  parseResponse(
    client[API.VERSION.CURRENT].users.$get({
      query: {
        [USER.PARAM.PAGE]: String(params[USER.PARAM.PAGE]),
        [USER.PARAM.PER_PAGE]: String(params[USER.PARAM.PER_PAGE]),
        [USER.PARAM.SEARCH]: params[USER.PARAM.SEARCH],
      },
    })
  );

/**
 * One page's key, tagged with the body it holds: the page hydrates under it,
 * so a wrong body or wrong params fail to compile, never a skipped hydration.
 */
export const usersListKey = (params: UsersParams) =>
  queryOptions<Awaited<ReturnType<typeof fetchUsers>>>({
    queryKey: QUERY.USERS.LIST(params),
  }).queryKey;

/**
 * One page of Users. The page reads it on the server (`readUsers`) and the
 * table reads it back under the same key.
 */
export const usersQuery = (client: ApiClient, params: UsersParams) =>
  queryOptions({
    queryFn: () => fetchUsers(client, params),
    queryKey: usersListKey(params),
    retry: retryUsers,
  });
