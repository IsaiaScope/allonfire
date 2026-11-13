import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DetailedError } from "hono/client";

/**
 * A TanStack `retry` that asks again up to `max` times after a server or
 * network failure, and never after the API refused (a 401, 403 or 400): below
 * a server error the request was at fault, so asking again changes nothing and
 * the error shows at once.
 */
export const retryUnlessRefused =
  (max: number) => (failureCount: number, error: unknown) =>
    failureCount < max &&
    !(
      error instanceof DetailedError &&
      typeof error.statusCode === "number" &&
      error.statusCode < HTTP.STATUS.INTERNAL_SERVER_ERROR
    );
