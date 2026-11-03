import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { IMAGE } from "../constants/image";
import {
  ImageTooLargeError,
  UnsupportedImageError,
} from "../prepare/prepare-image";

/**
 * A picture the decoder refused, as the client's error: too many pixels a 413
 * `IMAGE_TOO_LARGE` naming the limit, an unreadable or unaccepted file a 415
 * `UNSUPPORTED_IMAGE`; anything else rethrown. An Image's upload and an
 * Avatar's both answer through it.
 */
export const asImageError = (error: unknown): never => {
  if (error instanceof ImageTooLargeError) {
    throw new CodedError(
      {
        code: IMAGE.ERROR_CODE.IMAGE_TOO_LARGE,
        status: HTTP.STATUS.PAYLOAD_TOO_LARGE,
        values: { limit: IMAGE.LIMIT.INPUT_MEGAPIXELS },
      },
      { cause: error }
    );
  }
  if (error instanceof UnsupportedImageError) {
    throw new CodedError(
      {
        code: IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
        status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
      },
      { cause: error }
    );
  }
  throw error;
};
