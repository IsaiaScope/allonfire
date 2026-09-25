import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { z } from "zod";

/**
 * The statuses this API answers with a problem document. Drives the error arms
 * of `hc<AppType>`, and `STATUS_TO_ERROR_CODE` must map every one of them.
 */
export const ERROR_STATUS = [
  HTTP_STATUS.BAD_REQUEST,
  HTTP_STATUS.UNAUTHORIZED,
  HTTP_STATUS.FORBIDDEN,
  HTTP_STATUS.NOT_FOUND,
  HTTP_STATUS.PAYLOAD_TOO_LARGE,
  HTTP_STATUS.TOO_MANY_REQUESTS,
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
] as const;

export const errorStatusSchema = z.literal(ERROR_STATUS);
export type ErrorStatus = z.infer<typeof errorStatusSchema>;
