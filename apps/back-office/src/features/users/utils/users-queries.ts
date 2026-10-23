import { API } from "@allonfire/api/shared/constants/api";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { DetailedError, parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { MUTATION } from "@/shared/constants/mutation";
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

/**
 * One page of Users. The page prefetches it on the server and the table
 * reads it back under the same key; an error throws `DetailedError`.
 */
export const usersQuery = (client: ApiClient, params: UsersParams) =>
  queryOptions({
    queryFn: () =>
      parseResponse(
        client[API.VERSION.CURRENT].users.$get({
          query: {
            [USER.PARAM.PAGE]: String(params[USER.PARAM.PAGE]),
            [USER.PARAM.PER_PAGE]: String(params[USER.PARAM.PER_PAGE]),
            [USER.PARAM.SEARCH]: params[USER.PARAM.SEARCH],
          },
        })
      ),
    queryKey: QUERY.USERS.LIST(params),
    retry: retryUsers,
  });

/** Deletes the Users named; answers how many went. Never retried. */
export const deleteUsersMutation = (client: ApiClient) =>
  mutationOptions({
    mutationFn: (ids: string[]) =>
      parseResponse(
        client[API.VERSION.CURRENT].users.$delete({ json: { ids } })
      ),
    mutationKey: MUTATION.USERS.DELETE,
  });
