import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import {
  type ERROR_CODE,
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
