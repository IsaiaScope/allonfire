import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { KeyOf } from "@allonfire/core/shared/utils/object";
import type { App, ImageAccess } from "@allonfire/database/enums";
import { z } from "zod";
import { IMAGE } from "../../constants/image";
import type { UploadError } from "../../constants/image-schema";
import { type AddImageState, addImageSchema } from "./add-image-schema";
import { rowsOf, uploadFormOf } from "./image-form-data";

/** The API's codes an add is told by (`IMAGE.UPLOAD.REFUSAL`), each with its error. */
type AddImageRefusals = Readonly<
  Partial<Record<KeyOf<typeof IMAGE.UPLOAD.REFUSAL>, UploadError>>
>;

export type AddImagesInput = {
  /** Give every Image this access whatever the form posted (an App whose photos are never public). */
  access?: ImageAccess | undefined;
  /** Place every Image here whatever the form posted (an App that adds to one App only). */
  apps?: readonly App[] | undefined;
  form: FormData;
  /** The App's API call: `POST /v1/images` with these parts, as the visitor. */
  post: (upload: { file: File[]; meta: string }) => Promise<Response>;
  /** The App's `refusalOf` bound to its API codes; `known` is `IMAGE.UPLOAD.REFUSAL`. */
  refusalOf: (
    response: Response,
    known: AddImageRefusals
  ) => Promise<UploadError>;
};

const createdSchema = z.array(z.unknown());

/**
 * Adds the picked files as Images through the API as the visitor (an Admin of
 * every App named, checked there) in one request: all of them or none. Answers
 * why it failed, or how many were added. The checks here are the ones that
 * count; the caller clears its own caches after a saved add (`notice`). A
 * `post` that throws is the caller's to handle.
 */
export const addImages = async ({
  access,
  apps,
  form,
  post,
  refusalOf,
}: AddImagesInput): Promise<AddImageState> => {
  const rows = rowsOf(form).map((row) => ({
    ...row,
    ...(access && { access }),
    ...(apps && { apps: [...apps] }),
  }));
  const parsed = addImageSchema().safeParse({ rows });
  if (!parsed.success) {
    return { error: IMAGE.UPLOAD.ERROR.INVALID };
  }
  const response = await post(uploadFormOf(parsed.data.rows));
  if (response.status !== HTTP.STATUS.CREATED) {
    return {
      error: await refusalOf(response, IMAGE.UPLOAD.REFUSAL),
    };
  }
  return {
    added: createdSchema.parse(await response.json()).length,
    notice: IMAGE.UPLOAD.NOTICE.ADDED,
  };
};
