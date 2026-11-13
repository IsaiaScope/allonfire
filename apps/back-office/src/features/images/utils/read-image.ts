import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DetailedError } from "hono/client";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { IMAGES } from "../constants/images";
import { fetchImage } from "./images-queries";

/**
 * One Image as the visitor's Session reads it, kept in their browser only
 * (`"use cache: private"`) under the list's tag, so a link can prefetch its
 * page. A kept copy can be minutes old: the edit form sends the Image's
 * `version` and the API refuses a save on an older one (ADR 0028). Null for
 * an unknown (or hidden) id; any other refusal is thrown, never kept.
 */
export const readImage = async (id: string) => {
  "use cache: private";
  cacheTag(IMAGES.CACHE.TAG);
  cacheLife(IMAGES.CACHE.LIFE);
  try {
    return await fetchImage(sessionApi(await readSessionCookie()), id);
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
