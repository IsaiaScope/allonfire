import { USER } from "@allonfire/auth/features/users/constants/users";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  objectEntries,
  objectFromEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { z } from "zod";
import type { TranslationKey } from "../../features/i18n/constants/locales";

/**
 * The statuses this API answers with a problem document. Drives the error arms
 * of `hc<AppType>`, and `API.ERROR.CODE_OF_STATUS` must map every one of them.
 */
const ERROR_STATUS = [
  HTTP.STATUS.BAD_REQUEST,
  HTTP.STATUS.UNAUTHORIZED,
  HTTP.STATUS.FORBIDDEN,
  HTTP.STATUS.NOT_FOUND,
  HTTP.STATUS.CONFLICT,
  HTTP.STATUS.PAYLOAD_TOO_LARGE,
  HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
  HTTP.STATUS.TOO_MANY_REQUESTS,
  HTTP.STATUS.INTERNAL_SERVER_ERROR,
  HTTP.STATUS.SERVICE_UNAVAILABLE,
] as const;

export const errorStatusSchema = z.literal(ERROR_STATUS);
export type ErrorStatus = z.infer<typeof errorStatusSchema>;

/**
 * Every code the API answers with, the machine-readable half of an error
 * response: the standard ones (core's `ERROR.CODE`) plus those of the modules
 * it mounts. Built, never retyped: a code is typed once, by its owner.
 *
 * `satisfies Record<string, TranslationKey>` is what ties a code to a message: the
 * catalogue holds every localised string the API renders, only some of which
 * are errors, so the dependency runs this way. A module that adds a code
 * fails this line until the catalogue has its message, rather than
 * `translate(code, …)` failing at each call site — or, worse, at runtime in a
 * locale nobody tested.
 */
const ERROR_CODE = {
  ...ERROR.CODE,
  ...IMAGE.ERROR_CODE,
  ...USER.ERROR_CODE,
} as const satisfies Record<string, TranslationKey>;

export const errorCodeSchema = z.enum(ERROR_CODE);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/**
 * `satisfies Record<ErrorStatus, ErrorCode>`, not an annotation: the annotation
 * widened every lookup to the whole `ErrorCode` union, `satisfies` keeps
 * `API.ERROR.CODE_OF_STATUS[404]` typed as `"NOT_FOUND"`. Keyed by `ErrorStatus`
 * rather than `number`: adding a status to `API.ERROR.STATUS` without mapping it
 * here fails to compile, which is the whole reason the lookup is total and
 * needs no fallback of its own.
 */
const STATUS_TO_ERROR_CODE = {
  [HTTP.STATUS.BAD_REQUEST]: ERROR_CODE.BAD_REQUEST,
  [HTTP.STATUS.UNAUTHORIZED]: ERROR_CODE.UNAUTHORIZED,
  [HTTP.STATUS.FORBIDDEN]: ERROR_CODE.FORBIDDEN,
  [HTTP.STATUS.NOT_FOUND]: ERROR_CODE.NOT_FOUND,
  // A bare 409 is the User module's taken email; the Image module throws its
  // own coded.
  [HTTP.STATUS.CONFLICT]: ERROR_CODE.EMAIL_TAKEN,
  [HTTP.STATUS.PAYLOAD_TOO_LARGE]: ERROR_CODE.PAYLOAD_TOO_LARGE,
  [HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE]: ERROR_CODE.UNSUPPORTED_IMAGE,
  [HTTP.STATUS.TOO_MANY_REQUESTS]: ERROR_CODE.RATE_LIMITED,
  [HTTP.STATUS.INTERNAL_SERVER_ERROR]: ERROR_CODE.INTERNAL_ERROR,
  // The only bare 503 is the API's own request timeout; the Image module
  // throws its upload timeout coded, with its own seconds.
  [HTTP.STATUS.SERVICE_UNAVAILABLE]: ERROR_CODE.TIMEOUT,
} as const satisfies Record<ErrorStatus, ErrorCode>;

/**
 * The one status each code is sent with, so the docs list under each status
 * only its own codes. `error-codes.test-d.ts` checks the bare-status default
 * above agrees with it.
 */
const ERROR_CODE_STATUS = {
  [ERROR_CODE.BAD_REQUEST]: HTTP.STATUS.BAD_REQUEST,
  [ERROR_CODE.CANNOT_DELETE_SELF]: HTTP.STATUS.FORBIDDEN,
  [ERROR_CODE.CANNOT_CHANGE_OWN_ROLE]: HTTP.STATUS.FORBIDDEN,
  [ERROR_CODE.EMAIL_TAKEN]: HTTP.STATUS.CONFLICT,
  [ERROR_CODE.FORBIDDEN]: HTTP.STATUS.FORBIDDEN,
  [ERROR_CODE.IMAGE_CHANGED]: HTTP.STATUS.CONFLICT,
  [ERROR_CODE.IMAGE_TOO_LARGE]: HTTP.STATUS.PAYLOAD_TOO_LARGE,
  [ERROR_CODE.INTERNAL_ERROR]: HTTP.STATUS.INTERNAL_SERVER_ERROR,
  [ERROR_CODE.NOT_FOUND]: HTTP.STATUS.NOT_FOUND,
  [ERROR_CODE.PAYLOAD_TOO_LARGE]: HTTP.STATUS.PAYLOAD_TOO_LARGE,
  [ERROR_CODE.RATE_LIMITED]: HTTP.STATUS.TOO_MANY_REQUESTS,
  [ERROR_CODE.TIMEOUT]: HTTP.STATUS.SERVICE_UNAVAILABLE,
  [ERROR_CODE.UNAUTHORIZED]: HTTP.STATUS.UNAUTHORIZED,
  [ERROR_CODE.UNSUPPORTED_IMAGE]: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
  [ERROR_CODE.VALIDATION_FAILED]: HTTP.STATUS.BAD_REQUEST,
} as const satisfies Record<ErrorCode, ErrorStatus>;

/** The codes sent with `status`, in `API.ERROR.CODE` order. */
export const codesFor = (status: ErrorStatus): ErrorCode[] =>
  objectEntries(ERROR_CODE_STATUS).flatMap(([code, codeStatus]) =>
    codeStatus === status ? [code] : []
  );

/**
 * The stable identifier for each problem type, per RFC 9457 §3.1.1.
 *
 * Derived from the code rather than written out, so the two cannot drift. A
 * relative reference is a valid URI reference and needs no configured origin;
 * it is not dereferenceable yet, which the RFC permits — the requirement is
 * that it stay stable, and a value computed from `API.ERROR.CODE` cannot be
 * anything else.
 *
 * `objectFromEntries` is what makes the annotation load-bearing. The standard
 * `Object.fromEntries` returns `{ [k: string]: string }`, so reaching
 * `Record<ErrorCode, string>` needed an `as` that would have accepted entries
 * covering none of the codes. Here the key type is inferred from the entries
 * and the annotation checks it.
 */
const ERROR_TYPE: Record<ErrorCode, string> = objectFromEntries(
  objectValues(ERROR_CODE).map(
    (code) =>
      [code, `/errors/${code.toLowerCase().replaceAll("_", "-")}`] as const
  )
);

/** Stand-in when `requestId` is missing — only reachable outside the chain. */
const UNKNOWN_REQUEST_ID = "unknown";

/**
 * `API.ERROR` (`./api`), declared here for its size: every code the API
 * answers with, the statuses it answers with a problem document, and how the
 * two map onto each other. Read it as `API.ERROR`, never by this name.
 */
export const API_ERROR = {
  CODE: ERROR_CODE,
  /** The code a bare status is sent with. */
  CODE_OF_STATUS: STATUS_TO_ERROR_CODE,
  STATUS: ERROR_STATUS,
  /** The one status each code is sent with. */
  STATUS_OF_CODE: ERROR_CODE_STATUS,
  TYPE: ERROR_TYPE,
  UNKNOWN_REQUEST_ID,
} as const;
