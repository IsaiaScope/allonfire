"use server";

// jscpd:ignore-start
import { API } from "@allonfire/api/shared/constants/api";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { updateTag } from "next/cache";
import {
  type ApiRefusalKey,
  refusalOf,
} from "@/features/api/utils/api-refusal";
import { serverApi } from "@/features/api/utils/server-api";
import { STORAGE } from "@/features/storage/constants/storage";
// jscpd:ignore-end
import { IMAGES } from "../constants/images";
import {
  type EditImageError,
  type EditImageNotice,
  editImageSchema,
} from "../utils/edit-image-schema";
import { editValuesOf } from "../utils/image-form-data";

/** Why saving failed, or, the Image saved, that it was (`notice`). */
export type EditImageState = {
  error?: EditImageError;
  notice?: EditImageNotice;
};

/**
 * Saves an Image through the API as the visitor (Roles checked there): its
 * alt in every language the form posted (the API replaces the whole alt, so a
 * language left out is removed), its access and its Apps, on the `version` the
 * form was opened with. When the Image changed since, the API refuses
 * (`CHANGED`) and nothing is written. Never redirects: the form toasts what it
 * answers and goes to the list. The checks here are the ones that count.
 */
export const editImage = async (
  { id, version }: { id: string; version: string },
  _state: EditImageState,
  form: FormData
): Promise<EditImageState> => {
  const parsed = editImageSchema().safeParse(editValuesOf(form));
  if (!parsed.success) {
    return { error: IMAGES.EDIT_ERROR.INVALID };
  }
  const { access, alt, apps } = parsed.data;
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].images.$patch({
    json: [{ access, alt, apps, id, version }],
  });
  if (res.status !== HTTP.STATUS.OK) {
    const error = await refusalOf(
      res,
      IMAGES.EDIT_ERROR,
      new Map<ApiRefusalKey, EditImageError>([
        [HTTP.STATUS.NOT_FOUND, IMAGES.EDIT_ERROR.GONE],
        [ERROR.CODE.RESOURCE_CHANGED, IMAGES.EDIT_ERROR.CHANGED],
        [IMAGE.ERROR_CODE.IMAGE_CHANGED, IMAGES.EDIT_ERROR.CHANGED],
      ])
    );
    // No `updateTag` on a refusal, `CHANGED` included: it would redraw this
    // form on the newer version under what was typed (see `editUser`).
    return { error };
  }
  updateTag(IMAGES.CACHE.TAG);
  updateTag(STORAGE.CACHE.TAG);
  return { notice: IMAGES.EDIT_NOTICE.SAVED };
};
