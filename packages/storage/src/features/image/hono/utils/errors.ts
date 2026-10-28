import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { IMAGE } from "../../constants/image";
import {
  ImageTooLargeError,
  UnsupportedImageError,
} from "../../prepare/prepare-image";

export const notFound = (options?: ErrorOptions) =>
  new CodedError(
    { code: ERROR.CODE.NOT_FOUND, status: HTTP.STATUS.NOT_FOUND },
    options
  );

export const forbidden = () =>
  new CodedError({
    code: ERROR.CODE.FORBIDDEN,
    status: HTTP.STATUS.FORBIDDEN,
  });

/** 413 naming the limit that was actually crossed, not a host-wide one. */
export const tooLarge = (limit: number) =>
  new CodedError({
    code: ERROR.CODE.PAYLOAD_TOO_LARGE,
    status: HTTP.STATUS.PAYLOAD_TOO_LARGE,
    values: { limit },
  });

/** The service's unknown-id error, as the 404 every other route answers. */
export const notFoundOnUnknownIds = (error: unknown): never => {
  if (error instanceof ImageNotFoundError) {
    throw notFound({ cause: error });
  }
  throw error;
};

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
