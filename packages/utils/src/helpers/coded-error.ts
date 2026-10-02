import { HTTP_STATUS } from "../constants/http";
import { SEPARATOR } from "../constants/separators";

/** The ICU values a code's message interpolates. */
export type CodedErrorValues = Readonly<Record<string, number | string>>;

/** One field that failed validation: where, and why. */
export type CodedErrorDetail = { message: string; path: string };

type CodedErrorFields = {
  /** An HTTP error status. */
  status: number;
  /** The host's error code; the host owns its message and translation. */
  code: string;
  /** The ICU values the code's message interpolates. */
  values?: CodedErrorValues;
  /** Per-field failures, for a validation error. */
  errors?: readonly CodedErrorDetail[];
};

/**
 * What a shared HTTP module throws instead of building a response: the host's
 * error handler renders it in its own format and language (ADR 0015). Plain
 * `Error`, not Hono's `HTTPException`, so it needs no web framework.
 */
export class CodedError extends Error {
  readonly status: number;
  readonly code: string;
  readonly values: CodedErrorValues;
  readonly errors: readonly CodedErrorDetail[];

  constructor(
    { status, code, values = {}, errors = [] }: CodedErrorFields,
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = "CodedError";
    this.status = status;
    this.code = code;
    this.values = values;
    this.errors = errors;
  }
}

/** The part of a Standard Schema issue a host reads. */
export type StandardIssue = {
  readonly message: string;
  readonly path?:
    | readonly (PropertyKey | { readonly key: PropertyKey })[]
    | undefined;
};

/** What a Standard Schema validator hook receives. */
type ValidationResult =
  | { success: true }
  | { success: false; error?: readonly StandardIssue[] };

const pathOf = (issue: StandardIssue): string =>
  (issue.path ?? [])
    .map((segment) =>
      typeof segment === "object" && segment !== null && "key" in segment
        ? String(segment.key)
        : String(segment)
    )
    .join(SEPARATOR.PATH);

/** A 400 under the host's validation `code`, each failed field named. */
export const validationError = (
  code: string,
  issues: readonly StandardIssue[]
): CodedError => {
  const errors = issues.map((issue) => ({
    message: issue.message,
    path: pathOf(issue),
  }));
  return new CodedError({
    code,
    errors,
    status: HTTP_STATUS.BAD_REQUEST,
    values: { count: errors.length },
  });
};

/** A validator hook (`sValidator`, hono-openapi) that throws `validationError`. */
export const invalidHook =
  (code: string) =>
  (result: ValidationResult): void => {
    if (!result.success) {
      throw validationError(code, result.error ?? []);
    }
  };
