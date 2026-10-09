import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { IMAGE_ERROR_CODE } from "../constants/errors";

export const notFound = (options?: ErrorOptions) =>
  new CodedError(
    { code: IMAGE_ERROR_CODE.NOT_FOUND, status: HTTP_STATUS.NOT_FOUND },
    options
  );

export const forbidden = () =>
  new CodedError({
    code: IMAGE_ERROR_CODE.FORBIDDEN,
    status: HTTP_STATUS.FORBIDDEN,
  });

/** 413 naming the limit that was actually crossed, not a host-wide one. */
export const tooLarge = (limit: number) =>
  new CodedError({
    code: IMAGE_ERROR_CODE.PAYLOAD_TOO_LARGE,
    status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
    values: { limit },
  });

/** The service's unknown-id error, as the 404 every other route answers. */
export const notFoundOnUnknownIds = (error: unknown): never => {
  if (error instanceof ImageNotFoundError) {
    throw notFound({ cause: error });
  }
  throw error;
};
