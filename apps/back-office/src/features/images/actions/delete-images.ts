"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { serverApi } from "@/features/api/utils/server-api";
import { STORAGE } from "@/features/storage/constants/storage";
import { IMAGES } from "../constants/images";

/**
 * Deletes the Images named through the API as the visitor (an Admin of every
 * App each is in: checked there), then drops every kept Images list and the
 * Storage overview's numbers in the same request, so none can still show them.
 * Answers how many went (fewer than named when another Admin got there first:
 * the kept copies are dropped too), or `null` when the API refused: a thrown
 * error reaches the browser without its message in production.
 */
export const deleteImages = async (ids: string[]): Promise<number | null> => {
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].images.$delete({
    json: { ids },
  });
  if (res.status !== HTTP.STATUS.OK) {
    return null;
  }
  updateTag(IMAGES.CACHE.TAG);
  updateTag(STORAGE.CACHE.TAG);
  const { deleted } = await res.json();
  return deleted;
};
