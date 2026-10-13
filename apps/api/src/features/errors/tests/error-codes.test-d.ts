import type { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { API } from "../../../shared/constants/api";
import type { ErrorStatus } from "../../../shared/constants/error";
import { codeForStatus } from "../middleware/error-handler";

expectTypeOf(API.ERROR.CODE_OF_STATUS[HTTP.STATUS.BAD_REQUEST]).toEqualTypeOf<
  typeof ERROR.CODE.BAD_REQUEST
>();
expectTypeOf(
  API.ERROR.CODE_OF_STATUS[HTTP.STATUS.SERVICE_UNAVAILABLE]
).toEqualTypeOf<typeof ERROR.CODE.TIMEOUT>();

expectTypeOf(codeForStatus(HTTP.STATUS.NOT_FOUND)).toEqualTypeOf<
  typeof ERROR.CODE.NOT_FOUND
>();

// A bare status falls back to a code sent with that same status.
type DefaultMismatch = {
  [S in ErrorStatus]: (typeof API.ERROR.STATUS_OF_CODE)[(typeof API.ERROR.CODE_OF_STATUS)[S]] extends S
    ? never
    : S;
}[ErrorStatus];
expectTypeOf<DefaultMismatch>().toBeNever();
