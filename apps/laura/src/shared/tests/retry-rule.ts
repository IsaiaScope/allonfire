import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DetailedError } from "hono/client";

/** What a good `retry` answers: never, once more, and never past the limit. */
export const ONLY_SERVER_FAILURES = [false, true, false];

/**
 * What a query's `retry` answers after the API refused (401), after a server
 * failure, and after a server failure past `limit` tries.
 */
export const retryAnswers = (retry: unknown, limit: number) => {
  if (typeof retry !== "function") {
    throw new TypeError("retry is a function");
  }
  const refused = new DetailedError("refused", {
    statusCode: HTTP.STATUS.UNAUTHORIZED,
  });
  const broken = new DetailedError("broken", {
    statusCode: HTTP.STATUS.INTERNAL_SERVER_ERROR,
  });
  return [retry(0, refused), retry(0, broken), retry(limit, broken)];
};
