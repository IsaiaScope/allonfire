import { CodedError } from "../../errors/coded-error";
import { ERROR } from "../../errors/constants/error-codes";
import { HTTP } from "../../http/constants/http";

/** A save refused: the resource changed since the version it carries. */
export const resourceChanged = () =>
  new CodedError({
    code: ERROR.CODE.RESOURCE_CHANGED,
    status: HTTP.STATUS.CONFLICT,
  });
