"use server";

// jscpd:ignore-start
import { API } from "@allonfire/api/shared/constants/api";
import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import type { AddImageState } from "@allonfire/ui/features/image/upload/utils/add-image-schema";
import { addImages } from "@allonfire/ui/features/image/upload/utils/add-images";
import { updateTag } from "next/cache";
import { refusalOf } from "@/features/api/utils/api-refusal";
import { serverApi } from "@/features/api/utils/server-api";
import { STORAGE } from "@/features/storage/constants/storage";
// jscpd:ignore-end
import { IMAGES } from "../constants/images";

/**
 * Adds the picked files as Images through the API as the visitor (an Admin of
 * every App named, checked there) in one request: all of them or none. On
 * success drops the Images and Storage numbers the server keeps and answers
 * how many were added; the form then reads its own copies again and goes to
 * the list. A refusal hands back why and clears nothing. The checks are the
 * shared ones (`addImages`).
 */
export const addImage = async (
  _state: AddImageState,
  form: FormData
): Promise<AddImageState> => {
  // jscpd:ignore-start
  // The same call as Laura's: each App's action differs in what it passes
  // beside it and in which cache it drops.
  const client = await serverApi();
  const state = await addImages({
    form,
    post: (upload) =>
      client[API.VERSION.CURRENT].images.$post({ form: upload }),
    refusalOf: (response, known) =>
      refusalOf(response, IMAGE.UPLOAD.ERROR, known),
  });
  // jscpd:ignore-end
  if (state.notice) {
    // The kept lists and the Storage numbers lack the new Images.
    updateTag(IMAGES.CACHE.TAG);
    updateTag(STORAGE.CACHE.TAG);
  }
  return state;
};
