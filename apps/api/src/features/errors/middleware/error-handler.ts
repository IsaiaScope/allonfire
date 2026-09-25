import {
  CONTENT_TYPE,
  HTTP_HEADER,
  HTTP_STATUS,
} from "@allonfire/utils/constants/http";
import { SEPARATOR } from "@allonfire/utils/constants/separators";
import { MS_PER_SECOND } from "@allonfire/utils/constants/units";
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { getReasonPhrase } from "http-status-codes";
import {
  type ErrorStatus,
  errorStatusSchema,
} from "../../../shared/constants/http";
import {
  BODY_LIMIT_BYTES,
  REQUEST_TIMEOUT_MS,
} from "../../../shared/constants/limits";
import { CONTEXT_VAR, LOG_MESSAGE } from "../../../shared/constants/runtime";
import type { Locale } from "../../i18n/constants/locales";
import { localeOf } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import { logger } from "../../logger/logger";
import {
  ERROR_CODE,
  ERROR_TYPE,
  type ErrorCode,
  STATUS_TO_ERROR_CODE,
  UNKNOWN_REQUEST_ID,
} from "../constants/error-codes";
import type { ErrorDetail, ProblemDetails } from "../constants/problem-details";

// Re-exported so callers import the error contract from the middleware that
// produces it, without reaching into constants/ themselves.
export type { ErrorCode } from "../constants/error-codes";
export type {
  ErrorDetail,
  ProblemDetails,
} from "../constants/problem-details";

const isErrorStatus = (status: number): status is ErrorStatus =>
  errorStatusSchema.safeParse(status).success;

/** Generic, so a literal status gives its exact code: `codeForStatus(404)` is `"NOT_FOUND"`. */
export const codeForStatus = <S extends ErrorStatus>(
  status: S
): (typeof STATUS_TO_ERROR_CODE)[S] => STATUS_TO_ERROR_CODE[status];

/**
 * Renders a code with the values this layer can supply.
 *
 * `onError` sees whatever status Hono's middleware threw, so it has to cover
 * every code — including the parameterized ones. The values come from the same
 * constants the middleware was configured with, so the message cannot claim a
 * limit the server does not enforce. The switch is exhaustive: a new code with
 * values fails to compile here until it is handled.
 */
export function fallbackMessage(code: ErrorCode, locale: Locale): string {
  switch (code) {
    case ERROR_CODE.VALIDATION_FAILED:
      return translate(code, locale, { count: 0 });
    case ERROR_CODE.RATE_LIMITED:
      return translate(code, locale, { seconds: 0 });
    case ERROR_CODE.TIMEOUT:
      return translate(code, locale, {
        seconds: REQUEST_TIMEOUT_MS / MS_PER_SECOND,
      });
    case ERROR_CODE.PAYLOAD_TOO_LARGE:
      return translate(code, locale, { limit: BODY_LIMIT_BYTES });
    default:
      return translate(code, locale);
  }
}

function requestIdOf(context: Context): string {
  return context.get(CONTEXT_VAR.REQUEST_ID) ?? UNKNOWN_REQUEST_ID;
}

/**
 * Builds an RFC 9457 problem document.
 *
 * `title` is the status's registered reason phrase rather than a string we
 * maintain: the RFC wants it invariant across occurrences, which is exactly
 * what a reason phrase is. Everything that varies — and everything localised —
 * is `detail`.
 */
/** What varies between one problem document and the next. */
export type Problem = {
  code: ErrorCode;
  status: ErrorStatus;
  detail: string;
  errors?: ErrorDetail[];
};

function problem(
  context: Context,
  { code, status, detail, errors }: Problem
): ProblemDetails {
  return {
    code,
    detail,
    instance: context.req.path,
    requestId: requestIdOf(context),
    status,
    title: getReasonPhrase(status),
    type: ERROR_TYPE[code],
    ...(errors ? { errors } : {}),
  };
}

/** RFC 9457 documents carry their own media type, not `application/json`. */
const PROBLEM_HEADERS = {
  [HTTP_HEADER.CONTENT_TYPE]: CONTENT_TYPE.PROBLEM_JSON,
} as const;

/**
 * The finished error response: the problem document, its status, and the
 * problem media type. Every error the API sends goes through here, so no
 * caller has to know the headers or keep `status` and the body in step.
 */
export const problemResponse = (context: Context, fields: Problem): Response =>
  context.json(problem(context, fields), fields.status, PROBLEM_HEADERS);

/**
 * Hono hands only `Error` instances to `onError`; anything else thrown
 * (`throw "x"`, a promise rejected with a plain object) escapes the app and the
 * server answers with a bare-text 500. Registered first, this wraps such a
 * value in an `Error` so the next layer out routes it to `onError` like any
 * other failure. The original value stays on `cause` for the log.
 */
export const normalizeThrown =
  (): MiddlewareHandler => async (_context, next) => {
    try {
      await next();
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error(LOG_MESSAGE.NON_ERROR_THROWN, { cause: err });
    }
  };

export function onError(err: Error, context: Context): Response {
  const requestId = requestIdOf(context);

  // `HTTPException.status` is Hono's ContentfulStatusCode, a wider set than this
  // API documents. One it does not (a 418) is a bug: it falls through to the
  // unhandled path, gets logged and answers 500.
  if (err instanceof HTTPException && isErrorStatus(err.status)) {
    const { status } = err;
    const code = codeForStatus(status);
    // An explicit message on the exception is caller-supplied and already in
    // whatever language the caller chose, so it wins. Hono's own middleware
    // throws with an empty message, which is where the catalogue takes over.
    const detail = err.message || fallbackMessage(code, localeOf(context));
    return problemResponse(context, {
      code,
      detail,
      status,
    });
  }

  // pino's `err` serializer drops a `cause` that is not an Error, which is
  // exactly what `normalizeThrown` stores: log the thrown value beside it.
  const thrown = err.cause instanceof Error ? undefined : err.cause;
  logger.error({ err, requestId, thrown }, LOG_MESSAGE.UNHANDLED_ERROR);

  return problemResponse(context, {
    code: ERROR_CODE.INTERNAL_ERROR,
    detail: translate(ERROR_CODE.INTERNAL_ERROR, localeOf(context)),
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}

export function notFound(context: Context): Response {
  return problemResponse(context, {
    code: ERROR_CODE.NOT_FOUND,
    detail: translate(ERROR_CODE.NOT_FOUND, localeOf(context)),
    status: HTTP_STATUS.NOT_FOUND,
  });
}

/**
 * Matches `Hook` from `@hono/standard-validator`: on failure `error` is the
 * Standard Schema issue array itself, not a wrapper object.
 */
type StandardIssue = {
  readonly message: string;
  readonly path?:
    | readonly (PropertyKey | { readonly key: PropertyKey })[]
    | undefined;
};

type ValidationResult =
  | { success: true }
  | { success: false; error?: readonly StandardIssue[] };

function issuePath(issue: StandardIssue): string {
  return (issue.path ?? [])
    .map((segment) =>
      typeof segment === "object" && segment !== null && "key" in segment
        ? String(segment.key)
        : String(segment)
    )
    .join(SEPARATOR.PATH);
}

export function validationHook(result: ValidationResult, context: Context) {
  if (result.success) {
    return;
  }

  const details: ErrorDetail[] = (result.error ?? []).map((issue) => ({
    message: issue.message,
    path: issuePath(issue),
  }));

  return problemResponse(context, {
    code: ERROR_CODE.VALIDATION_FAILED,
    detail: translate(ERROR_CODE.VALIDATION_FAILED, localeOf(context), {
      count: details.length,
    }),
    errors: details,
    status: HTTP_STATUS.BAD_REQUEST,
  });
}
