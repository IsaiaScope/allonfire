import {
  CodedError,
  notFound,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { IMAGE } from "../../constants/image";

/**
 * 409: another request changed the Image while this one was working on it
 * (made it public while it was turning private); asking again settles it.
 */
export const imageChanged = () =>
  new CodedError({
    code: IMAGE.ERROR_CODE.IMAGE_CHANGED,
    status: HTTP.STATUS.CONFLICT,
  });

/** The service's unknown-id error, as the 404 every other route answers. */
export const notFoundOnUnknownIds = (error: unknown): never => {
  if (error instanceof ImageNotFoundError) {
    throw notFound({ cause: error });
  }
  throw error;
};
