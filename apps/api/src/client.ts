import type { ApplyGlobalResponse } from "hono/client";
import type { createApp } from "./app";
import type { ProblemDetails } from "./features/errors/middleware/error-handler";
import type { API } from "./shared/constants/api";

/**
 * The API app's type, as `hc` reads it.
 * @internal
 */
export type AppType = ReturnType<typeof createApp>;

/**
 * The error contract a client reads, from the middleware that produces it.
 * @internal
 */
export type {
  ErrorCode,
  ProblemDetails,
} from "./features/errors/middleware/error-handler";

/**
 * The client-facing app type. `AppType` alone describes only the success
 * responses; `onError` and `notFound` are invisible to it. Merging the error
 * envelope here means a consumer type-checks both halves of every call.
 */
export type ApiType = ApplyGlobalResponse<
  AppType,
  { [S in (typeof API.ERROR.STATUS)[number]]: { json: ProblemDetails } }
>;
