import { objectFromEntries, objectValues } from "@allonfire/utils/object";
import { z } from "zod";
import { type ErrorStatus, HTTP_STATUS } from "../../../shared/constants/http";
import type { TranslationKey } from "../../i18n/constants/locales";

/**
 * The machine-readable half of every error response. One declaration yields
 * the runtime map, the validator and the type — replacing a hand-written union
 * that had to be kept in step with the status map below by eye.
 *
 * `satisfies Record<string, TranslationKey>` is what ties a code to a message: the
 * catalogue holds every localised string the API renders, only some of which
 * are errors, so the dependency runs this way. Add a code without adding the
 * message and this line fails, rather than `translate(code, …)` failing at
 * each call site — or, worse, at runtime in a locale nobody tested.
 */
export const ERROR_CODE = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const satisfies Record<string, TranslationKey>;

export const errorCodeSchema = z.enum(ERROR_CODE);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/**
 * `Record<ErrorStatus, ErrorCode>` rather than `Record<number, …>`: adding a
 * status to `ERROR_STATUS` without mapping it here fails to compile, which is
 * the whole reason the lookup is total and needs no fallback of its own.
 */
export const STATUS_TO_ERROR_CODE: Record<ErrorStatus, ErrorCode> = {
  [HTTP_STATUS.BAD_REQUEST]: ERROR_CODE.BAD_REQUEST,
  [HTTP_STATUS.UNAUTHORIZED]: ERROR_CODE.UNAUTHORIZED,
  [HTTP_STATUS.FORBIDDEN]: ERROR_CODE.FORBIDDEN,
  [HTTP_STATUS.NOT_FOUND]: ERROR_CODE.NOT_FOUND,
  [HTTP_STATUS.REQUEST_TIMEOUT]: ERROR_CODE.TIMEOUT,
  [HTTP_STATUS.PAYLOAD_TOO_LARGE]: ERROR_CODE.PAYLOAD_TOO_LARGE,
  [HTTP_STATUS.TOO_MANY_REQUESTS]: ERROR_CODE.RATE_LIMITED,
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: ERROR_CODE.INTERNAL_ERROR,
};

/**
 * The stable identifier for each problem type, per RFC 9457 §3.1.1.
 *
 * Derived from the code rather than written out, so the two cannot drift. A
 * relative reference is a valid URI reference and needs no configured origin;
 * it is not dereferenceable yet, which the RFC permits — the requirement is
 * that it stay stable, and a value computed from `ERROR_CODE` cannot be
 * anything else.
 *
 * `objectFromEntries` is what makes the annotation load-bearing. The standard
 * `Object.fromEntries` returns `{ [k: string]: string }`, so reaching
 * `Record<ErrorCode, string>` needed an `as` that would have accepted entries
 * covering none of the codes. Here the key type is inferred from the entries
 * and the annotation checks it.
 */
export const ERROR_TYPE: Record<ErrorCode, string> = objectFromEntries(
  objectValues(ERROR_CODE).map(
    (code) =>
      [code, `/errors/${code.toLowerCase().replaceAll("_", "-")}`] as const
  )
);

/** Stand-in when `requestId` is missing — only reachable outside the chain. */
export const UNKNOWN_REQUEST_ID = "unknown";
