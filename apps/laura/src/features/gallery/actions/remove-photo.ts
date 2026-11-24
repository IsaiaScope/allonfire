"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { serverApi } from "@/features/api/utils/server-api";
import { LAURA } from "@/shared/constants/laura";
import { GALLERY } from "../constants/gallery";

/**
 * Takes one photo out of Laura through the Image module as the visitor (an
 * Admin of Laura: checked there; the file is deleted for good only when no
 * other App holds it), then drops the kept first pages of both lists in the
 * same request. Answers how many went: 0 when another Admin got there first,
 * which is a success. `null` when the API refused: a thrown error reaches the
 * browser without its message in production.
 */
export const removePhoto = async (imageId: string): Promise<number | null> => {
  const client = await serverApi();
  const response = await client[API.VERSION.CURRENT].images.$delete({
    json: { app: LAURA.app, ids: [imageId] },
  });
  if (response.status !== HTTP.STATUS.OK) {
    return null;
  }
  updateTag(GALLERY.CACHE.TAG);
  const { deleted } = await response.json();
  return deleted;
};
