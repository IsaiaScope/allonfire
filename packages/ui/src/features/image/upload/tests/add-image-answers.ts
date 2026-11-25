import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { FAKE_API } from "@allonfire/core/features/next/api/tests/fake-api";
import type { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGE } from "../../constants/image";
import { imageNames, rowPrefix } from "../utils/image-form-data";

/**
 * What an App's `addImage` action test shares: the answers its fake API
 * gives to `POST /v1/images`, and what each refusal is told as.
 */

/** The API created `count` Images. */
export const created = (count: number) =>
  FAKE_API.answers.set(HTTP.METHOD.POST, {
    body: Array.from({ length: count }, (_, id) => ({ id: String(id) })),
    status: HTTP.STATUS.CREATED,
  });

/** The API refused with `status`, and the problem `code` when it has one. */
export const refused = (status: number, code?: string) =>
  FAKE_API.answers.set(HTTP.METHOD.POST, code ? { code, status } : { status });

/** Each refusal as `[status, code, the error the form shows]`, for `it.each`. */
export const REFUSALS = [
  [
    HTTP.STATUS.PAYLOAD_TOO_LARGE,
    STORED_IMAGE.ERROR_CODE.IMAGE_TOO_LARGE,
    IMAGE.UPLOAD.ERROR.TOO_LARGE,
  ],
  [
    HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    STORED_IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
    IMAGE.UPLOAD.ERROR.UNSUPPORTED,
  ],
  [HTTP.STATUS.FORBIDDEN, ERROR.CODE.FORBIDDEN, IMAGE.UPLOAD.ERROR.REFUSED],
  [HTTP.STATUS.INTERNAL_SERVER_ERROR, undefined, IMAGE.UPLOAD.ERROR.FAILED],
] as const;

/**
 * A form as an App's Add Images page posts it: `count` rows, each a file and
 * its alt, with an access and Apps only where the App's form has them.
 */
export const imageFormOf = (
  count: number,
  { access, apps = [] }: { access?: ImageAccess; apps?: readonly App[] } = {}
) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    const names = imageNames(rowPrefix(index));
    form.set(
      names.file,
      new File(["x"], `p${index}.jpg`, { type: "image/jpeg" })
    );
    if (access) {
      form.set(names.access, access);
    }
    form.set(names.alt("en"), `en ${index}`);
    form.set(names.alt("it"), `it ${index}`);
    for (const app of apps) {
      form.append(names.apps, app);
    }
  }
  return form;
};
