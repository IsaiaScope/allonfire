import {
  type ElementOf,
  objectValues,
  type ValueOf,
} from "@allonfire/utils/object";
import { z } from "zod";

/**
 * Every status this API returns. Values are what `context.json()` receives, so the
 * type below is what narrows those call sites — a status not listed here is a
 * compile error, not a runtime surprise.
 *
 * Deliberately numeric literals rather than `StatusCodes` from
 * `http-status-codes`. An enum member is its own type, not the literal `404`,
 * so `ERROR_STATUS` stops keying Hono's response map and every error arm of
 * `hc<AppType>` collapses to `never` — which `client.test-d.ts` catches. The
 * library is still used, for `getReasonPhrase`; the numbers are the spec's and
 * are not going to move.
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const httpStatusSchema = z.union(
  objectValues(HTTP_STATUS).map((status) => z.literal(status))
);

export type HttpStatus = ValueOf<typeof HTTP_STATUS>;

/** The subset that carries an error envelope. Drives `ErrorBody` mapping. */
export const ERROR_STATUS = [
  HTTP_STATUS.BAD_REQUEST,
  HTTP_STATUS.UNAUTHORIZED,
  HTTP_STATUS.FORBIDDEN,
  HTTP_STATUS.NOT_FOUND,
  HTTP_STATUS.REQUEST_TIMEOUT,
  HTTP_STATUS.PAYLOAD_TOO_LARGE,
  HTTP_STATUS.TOO_MANY_REQUESTS,
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
] as const;

export type ErrorStatus = ElementOf<typeof ERROR_STATUS>;

/**
 * RFC 9457 requires its own media type; a problem document served as plain
 * `application/json` is not one, and a client keying off the content type will
 * not recognise it.
 */
export const CONTENT_TYPE = {
  PROBLEM_JSON: "application/problem+json",
} as const;

export const HTTP_HEADER = {
  CONTENT_TYPE: "Content-Type",
  RETRY_AFTER: "Retry-After",
  X_FORWARDED_FOR: "x-forwarded-for",
  /** How the frontend passes its language key; absent means English. */
  ACCEPT_LANGUAGE: "accept-language",
} as const;

export type HttpHeader = ValueOf<typeof HTTP_HEADER>;
