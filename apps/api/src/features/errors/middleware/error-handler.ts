import {
  CodedError,
  invalidHook,
} from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { Locale } from "@allonfire/core/features/i18n/constants/locales";
import { UNIT } from "@allonfire/core/shared/constants/units";
import type { ValueOf } from "@allonfire/core/shared/utils/object";
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { getReasonPhrase } from "http-status-codes";
import { API } from "../../../shared/constants/api";
import {
  type ErrorCode,
  type ErrorStatus,
  errorCodeSchema,
  errorStatusSchema,
} from "../../../shared/constants/error";
import { localeOf } from "../../i18n/middleware/locale-resolver";
import { translate, translateCode } from "../../i18n/translate";
import { logger } from "../../logger/logger";
import type { ErrorDetail, ProblemDetails } from "../constants/problem-details";

// Re-exported so callers import the error contract from the middleware that
// produces it, without reaching into constants/ themselves.
export type { ErrorCode } from "../../../shared/constants/error";
export type {
  ErrorDetail,
  ProblemDetails,
} from "../constants/problem-details";

const isErrorStatus = (status: number): status is ErrorStatus =>
  errorStatusSchema.safeParse(status).success;

/** Generic, so a literal status gives its exact code: `codeForStatus(404)` is `"NOT_FOUND"`. */
export const codeForStatus = <S extends ErrorStatus>(
  status: S
): (typeof API.ERROR.CODE_OF_STATUS)[S] => API.ERROR.CODE_OF_STATUS[status];

/** The codes a bare `HTTPException` status maps to. */
type StatusErrorCode = ValueOf<typeof API.ERROR.CODE_OF_STATUS>;

/**
 * Renders a code with the values this layer can supply.
 *
 * `onError` sees whatever status Hono's middleware threw, so it has to cover
 * every code a status maps to — including the parameterized ones. The values
 * come from the same constants the middleware was configured with, so the
 * message cannot claim a limit the server does not enforce. A module throws
 * `CodedError` with its own values and never reaches here. The switch is
 * exhaustive: a new status code with values fails to compile here until it is
 * handled.
 */
export function fallbackMessage(code: StatusErrorCode, locale: Locale): string {
  switch (code) {
    case ERROR.CODE.RATE_LIMITED:
      return translate(code, locale, { seconds: 0 });
    case ERROR.CODE.TIMEOUT:
      return translate(code, locale, {
        seconds: API.LIMIT.REQUEST_TIMEOUT_MS / UNIT.MS_PER_SECOND,
      });
    case ERROR.CODE.PAYLOAD_TOO_LARGE:
      return translate(code, locale, { limit: API.LIMIT.BODY_BYTES });
    default:
      return translate(code, locale);
  }
}

function requestIdOf(context: Context): string {
  return (
    context.get(API.CONTEXT_VAR.REQUEST_ID) ?? API.ERROR.UNKNOWN_REQUEST_ID
  );
}

/** What varies between one problem document and the next. */
export type Problem = {
  code: ErrorCode;
  status: ErrorStatus;
  detail: string;
  errors?: ErrorDetail[];
};

/**
 * Builds an RFC 9457 problem document.
 *
 * `title` is the status's registered reason phrase rather than a string we
 * maintain: the RFC wants it invariant across occurrences, which is exactly
 * what a reason phrase is. Everything that varies — and everything localised —
 * is `detail`.
 */
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
    type: API.ERROR.TYPE[code],
    ...(errors ? { errors } : {}),
  };
}

/** RFC 9457 documents carry their own media type, not `application/json`. */
const PROBLEM_HEADERS = {
  [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.PROBLEM_JSON,
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
        : new Error(API.LOG_MESSAGE.NON_ERROR_THROWN, { cause: err });
    }
  };

export function onError(err: Error, context: Context): Response {
  const requestId = requestIdOf(context);

  // A shared module's error (ADR 0015): its code and values, our format and
  // language. A code or status this API does not document is a bug below.
  if (err instanceof CodedError) {
    const code = errorCodeSchema.safeParse(err.code);
    if (code.success && isErrorStatus(err.status)) {
      return problemResponse(context, {
        code: code.data,
        detail: translateCode(code.data, localeOf(context), err.values),
        status: err.status,
        ...(err.errors.length > 0 && { errors: [...err.errors] }),
      });
    }
  }

  // `HTTPException.status` is Hono's ContentfulStatusCode, a wider set than this
  // API documents. One it does not (a 418) is a bug: it falls through to the
  // unhandled path, gets logged and answers 500.
  if (err instanceof HTTPException && isErrorStatus(err.status)) {
    const { status } = err;
    const code = codeForStatus(status);
    // Always the catalogue: Hono's validators throw English text ("Malformed
    // JSON in request body") that would otherwise reach every language.
    return problemResponse(context, {
      code,
      detail: fallbackMessage(code, localeOf(context)),
      status,
    });
  }

  // pino's `err` serializer drops a `cause` that is not an Error, which is
  // exactly what `normalizeThrown` stores: log the thrown value beside it.
  const thrown = err.cause instanceof Error ? undefined : err.cause;
  logger.error({ err, requestId, thrown }, API.LOG_MESSAGE.UNHANDLED_ERROR);

  return problemResponse(context, {
    code: ERROR.CODE.INTERNAL_ERROR,
    detail: translate(ERROR.CODE.INTERNAL_ERROR, localeOf(context)),
    status: HTTP.STATUS.INTERNAL_SERVER_ERROR,
  });
}

export function notFound(context: Context): Response {
  return problemResponse(context, {
    code: ERROR.CODE.NOT_FOUND,
    detail: translate(ERROR.CODE.NOT_FOUND, localeOf(context)),
    status: HTTP.STATUS.NOT_FOUND,
  });
}

/**
 * A validator hook: a failed parse throws the coded 400, which `onError`
 * renders like any module's.
 */
export const validationHook = invalidHook;
