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
  type AddImageError,
  type AddImageNotice,
  addImageSchema,
} from "../utils/add-image-schema";
import { rowsOf, uploadFormOf } from "../utils/image-form-data";

/**
 * Why adding failed, or, the Images added, how many (`added`). The typed rows
 * and their files stay in the form (a File does not travel in an answer).
 */
export type AddImageState = {
  added?: number;
  error?: AddImageError;
  notice?: AddImageNotice;
};

/**
 * Adds the picked files as Images through the API as the visitor (an Admin of
 * every App named, checked there) in one request: all of them or none. On
 * success drops the Images and Storage numbers the server keeps and answers
 * how many were added; the form then reads its own copies again and goes to
 * the list. A refusal hands back why and clears nothing. The checks here are
 * the ones that count.
 */
export const addImage = async (
  _state: AddImageState,
  form: FormData
): Promise<AddImageState> => {
  const parsed = addImageSchema().safeParse({ rows: rowsOf(form) });
  if (!parsed.success) {
    return { error: IMAGES.ADD_ERROR.INVALID };
  }
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].images.$post({
    form: uploadFormOf(parsed.data.rows),
  });
  if (res.status !== HTTP.STATUS.CREATED) {
    const error = await refusalOf(
      res,
      IMAGES.ADD_ERROR,
      new Map<ApiRefusalKey, AddImageError>([
        [IMAGE.ERROR_CODE.IMAGE_TOO_LARGE, IMAGES.ADD_ERROR.TOO_LARGE],
        [IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE, IMAGES.ADD_ERROR.UNSUPPORTED],
        [ERROR.CODE.BAD_REQUEST, IMAGES.ADD_ERROR.INVALID],
      ])
    );
    return { error };
  }
  // The kept lists and the Storage numbers lack the new Images.
  updateTag(IMAGES.CACHE.TAG);
  updateTag(STORAGE.CACHE.TAG);
  return {
    added: (await res.json()).length,
    notice: IMAGES.ADD_NOTICE.ADDED,
  };
};
