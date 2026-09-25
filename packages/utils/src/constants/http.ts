import { z } from "zod";

/**
 * The statuses of RFC 9110 and its companions that a web app can reasonably
 * send. Numeric literals rather than `StatusCodes` from `http-status-codes`:
 * an enum member is its own type, not the literal `404`, so Hono's typed
 * response map loses the key and every error arm of `hc<AppType>` collapses to
 * `never` (apps/api's `client.test-d.ts` catches it). The library is still
 * used, for `getReasonPhrase`.
 */
export const HTTP_STATUS = {
  ACCEPTED: 202,
  BAD_GATEWAY: 502,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  CONTINUE: 100,
  CREATED: 201,
  EXPECTATION_FAILED: 417,
  FORBIDDEN: 403,
  FOUND: 302,
  GATEWAY_TIMEOUT: 504,
  GONE: 410,
  INTERNAL_SERVER_ERROR: 500,
  LENGTH_REQUIRED: 411,
  METHOD_NOT_ALLOWED: 405,
  MOVED_PERMANENTLY: 301,
  NO_CONTENT: 204,
  NOT_ACCEPTABLE: 406,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  NOT_MODIFIED: 304,
  OK: 200,
  PARTIAL_CONTENT: 206,
  /** RFC 9110 renamed it Content Too Large; the number is unchanged. */
  PAYLOAD_TOO_LARGE: 413,
  PAYMENT_REQUIRED: 402,
  PERMANENT_REDIRECT: 308,
  PRECONDITION_FAILED: 412,
  PRECONDITION_REQUIRED: 428,
  RANGE_NOT_SATISFIABLE: 416,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  REQUEST_TIMEOUT: 408,
  SEE_OTHER: 303,
  SERVICE_UNAVAILABLE: 503,
  SWITCHING_PROTOCOLS: 101,
  TEMPORARY_REDIRECT: 307,
  TOO_EARLY: 425,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  UNPROCESSABLE_CONTENT: 422,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UPGRADE_REQUIRED: 426,
  URI_TOO_LONG: 414,
} as const;

export const httpStatusSchema = z.enum(HTTP_STATUS);
export type HttpStatus = z.infer<typeof httpStatusSchema>;

/** Every method RFC 9110 defines, plus PATCH (RFC 5789). */
export const HTTP_METHOD = {
  CONNECT: "CONNECT",
  DELETE: "DELETE",
  GET: "GET",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  PATCH: "PATCH",
  POST: "POST",
  PUT: "PUT",
  TRACE: "TRACE",
} as const;

export const httpMethodSchema = z.enum(HTTP_METHOD);
export type HttpMethod = z.infer<typeof httpMethodSchema>;

export const CONTENT_TYPE = {
  EVENT_STREAM: "text/event-stream",
  FORM_URLENCODED: "application/x-www-form-urlencoded",
  HTML: "text/html",
  JSON: "application/json",
  MULTIPART_FORM_DATA: "multipart/form-data",
  OCTET_STREAM: "application/octet-stream",
  /**
   * RFC 9457 requires its own media type; a problem document served as plain
   * `application/json` is not one, and a client keying off the content type
   * will not recognise it.
   */
  PROBLEM_JSON: "application/problem+json",
  TEXT: "text/plain",
} as const;

export const contentTypeSchema = z.enum(CONTENT_TYPE);
export type ContentType = z.infer<typeof contentTypeSchema>;

/**
 * Lower-case, the form HTTP/2 puts on the wire and the Fetch `Headers` class
 * returns. Lookups are case-insensitive either way.
 */
export const HTTP_HEADER = {
  ACCEPT: "accept",
  /** How a frontend passes its language; absent means the default locale. */
  ACCEPT_LANGUAGE: "accept-language",
  AUTHORIZATION: "authorization",
  CACHE_CONTROL: "cache-control",
  CONTENT_LENGTH: "content-length",
  CONTENT_SECURITY_POLICY: "content-security-policy",
  CONTENT_TYPE: "content-type",
  COOKIE: "cookie",
  ETAG: "etag",
  IF_NONE_MATCH: "if-none-match",
  LOCATION: "location",
  ORIGIN: "origin",
  REFERRER_POLICY: "referrer-policy",
  RETRY_AFTER: "retry-after",
  SET_COOKIE: "set-cookie",
  STRICT_TRANSPORT_SECURITY: "strict-transport-security",
  USER_AGENT: "user-agent",
  VARY: "vary",
  X_CONTENT_TYPE_OPTIONS: "x-content-type-options",
  X_DNS_PREFETCH_CONTROL: "x-dns-prefetch-control",
  X_FORWARDED_FOR: "x-forwarded-for",
  X_FRAME_OPTIONS: "x-frame-options",
  X_REQUEST_ID: "x-request-id",
} as const;

export const httpHeaderSchema = z.enum(HTTP_HEADER);
export type HttpHeader = z.infer<typeof httpHeaderSchema>;
