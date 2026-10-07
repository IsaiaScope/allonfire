import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import type { ErrorStatus } from "../../../shared/constants/http";
import {
  type ERROR_CODE,
  type ERROR_CODE_STATUS,
  STATUS_TO_ERROR_CODE,
} from "../constants/error-codes";
import { codeForStatus } from "../middleware/error-handler";

expectTypeOf(STATUS_TO_ERROR_CODE[HTTP_STATUS.BAD_REQUEST]).toEqualTypeOf<
  typeof ERROR_CODE.BAD_REQUEST
>();
expectTypeOf(
  STATUS_TO_ERROR_CODE[HTTP_STATUS.SERVICE_UNAVAILABLE]
).toEqualTypeOf<typeof ERROR_CODE.TIMEOUT>();

expectTypeOf(codeForStatus(HTTP_STATUS.NOT_FOUND)).toEqualTypeOf<
  typeof ERROR_CODE.NOT_FOUND
>();

// A bare status falls back to a code sent with that same status.
type DefaultMismatch = {
  [S in ErrorStatus]: (typeof ERROR_CODE_STATUS)[(typeof STATUS_TO_ERROR_CODE)[S]] extends S
    ? never
    : S;
}[ErrorStatus];
expectTypeOf<DefaultMismatch>().toBeNever();
