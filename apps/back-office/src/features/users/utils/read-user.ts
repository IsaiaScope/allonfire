import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DetailedError } from "hono/client";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { USERS } from "../constants/users";
import { fetchUser } from "./users-queries";

/**
 * One User as the visitor's Session reads them, kept in their browser only
 * (`"use cache: private"`) under the list's tag, so a link can
 * prefetch their page. A kept copy can be minutes old: the edit form sends
 * the User's `version` and the API refuses a save on an older one, so a
 * Membership gained elsewhere is never overwritten (ADR 0028). Null for an
 * unknown id; any other refusal is thrown, never kept.
 */
export const readUser = async (id: string) => {
  "use cache: private";
  cacheTag(USERS.CACHE.TAG);
  cacheLife(USERS.CACHE.LIFE);
  try {
    return await fetchUser(sessionApi(await readSessionCookie()), id);
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
