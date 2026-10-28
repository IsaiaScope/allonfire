import type { ApiType } from "@allonfire/api/client";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { hc } from "hono/client";
import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/environment/environment";
import { USERS } from "../constants/users";
import type { UsersParams } from "../constants/users-params";
import { fetchUsers } from "./users-queries";

/**
 * One page of Users as the visitor (`sessionCookie`, from
 * `readSessionCookie`: the API checks them, and each Session keeps an entry
 * of its own), kept on this server under `USERS.CACHE.TAG`: every change to
 * Users calls `updateTag` on it. A refusal is thrown, never kept.
 */
export const readUsers = async (sessionCookie: string, params: UsersParams) => {
  "use cache";
  cacheTag(USERS.CACHE.TAG);
  cacheLife(USERS.CACHE.LIFE);
  return await fetchUsers(
    hc<ApiType>(env.API_URL, {
      headers: { [HTTP.HEADER.COOKIE]: sessionCookie },
    }),
    params
  );
};
