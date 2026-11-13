import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { USERS } from "../constants/users";
import { fetchUsersOverview, usersOverviewKey } from "./users-overview-queries";

/**
 * The Users overview as the visitor's Session reads it, ready for the view's
 * TanStack cache under the key it reads back. Kept in their browser only
 * (`"use cache: private"`, ADR 0028) under the Users' tag and life, so every
 * User change (`addUser`, `editUser`, `deleteUsers` call `updateTag`) drops it
 * with the list; dehydrated inside that cache, since TanStack stamps the time
 * into what it dehydrates. A refusal (a member who is not an Admin) is
 * thrown, never kept: the page leaves it to the view.
 */
export const usersOverviewHydration = async () => {
  "use cache: private";
  cacheTag(USERS.CACHE.TAG);
  cacheLife(USERS.CACHE.LIFE);
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(
    usersOverviewKey,
    await fetchUsersOverview(sessionApi(await readSessionCookie()))
  );
  return dehydrate(queryClient);
};
