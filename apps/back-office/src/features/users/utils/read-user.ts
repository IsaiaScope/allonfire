import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DetailedError } from "hono/client";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { USERS } from "../constants/users";
import { fetchUser } from "./users-queries";
import type { UsersVisitor } from "./users-visitor";

/**
 * One User as the visitor (`UsersVisitor`, the key's), kept on this server
 * under `USERS.CACHE.TAG` like the list (the User carries an Avatar link
 * signed for an hour), so a save's `updateTag` drops both. Null
 * for an unknown id; any other refusal is thrown, never kept.
 */
export const readUser = async ({ sessionCookie }: UsersVisitor, id: string) => {
  "use cache";
  cacheTag(USERS.CACHE.TAG);
  cacheLife(USERS.CACHE.LIFE);
  try {
    return await fetchUser(sessionApi(sessionCookie), id);
  } catch (error) {
    if (
      error instanceof DetailedError &&
      error.statusCode === HTTP.STATUS.NOT_FOUND
    ) {
      return null;
    }
    throw error;
  }
};
