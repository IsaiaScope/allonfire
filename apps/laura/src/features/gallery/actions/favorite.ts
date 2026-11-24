"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { serverApi } from "@/features/api/utils/server-api";
import { GALLERY } from "../constants/gallery";

/**
 * Marks (`favorite`) or clears a Favorite through the API as the visitor (a
 * Laura Admin: checked there), then drops the kept first pages of both lists
 * in the same request. Answers the state the photo is in now. A photo that is
 * gone (404) answers `null` and drops the kept copy too, so no list still
 * shows it; any other refusal answers `null`: a thrown error reaches the
 * browser without its message in production.
 */
export const setFavorite = async (
  imageId: string,
  favorite: boolean
): Promise<{ favorite: boolean } | null> => {
  const client = await serverApi();
  const one =
    client[API.VERSION.CURRENT][API.SEGMENT.LAURA].favorites[":imageId"];
  const response = await (favorite
    ? one.$put({ param: { imageId } })
    : one.$delete({ param: { imageId } }));
  if (response.status === HTTP.STATUS.NOT_FOUND) {
    updateTag(GALLERY.CACHE.TAG);
    return null;
  }
  if (response.status !== HTTP.STATUS.OK) {
    return null;
  }
  updateTag(GALLERY.CACHE.TAG);
  return { favorite };
};
