import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";

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
