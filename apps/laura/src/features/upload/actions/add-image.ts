"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import type { AddImageState } from "@allonfire/ui/features/image/upload/utils/add-image-schema";
import { addImages } from "@allonfire/ui/features/image/upload/utils/add-images";
import { updateTag } from "next/cache";
import { refusalOf } from "@/features/api/utils/api-refusal";
import { serverApi } from "@/features/api/utils/server-api";
import { GALLERY } from "@/features/gallery/constants/gallery";

/**
 * Adds the picked files to Laura through the API as the visitor (an Admin of
 * Laura, checked there) in one request: all of them or none. Every Image is
 * placed in Laura and private here, whatever the browser posted: nothing of
 * Laura is shown to a visitor who is not signed in. On success drops the
 * Gallery's kept first pages in the same request and answers how many were
 * added; the form then reads the browser's copies again. A refusal hands back
 * why and clears nothing.
 */
export const addImage = async (
  _state: AddImageState,
  form: FormData
): Promise<AddImageState> => {
  const client = await serverApi();
  const state = await addImages({
    access: ImageAccess.PRIVATE,
    apps: [App.LAURA],
    form,
    post: (upload) =>
      client[API.VERSION.CURRENT].images.$post({ form: upload }),
    refusalOf: (response, known) =>
      refusalOf(response, IMAGE.UPLOAD.ERROR, known),
  });
  if (state.notice) {
    updateTag(GALLERY.CACHE.TAG);
  }
  return state;
};
