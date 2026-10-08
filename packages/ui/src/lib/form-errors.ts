/** A message an AOF field shows under its input. */
export type FieldMessage = { message: string };

/** What decides whether an AOF field shows its errors yet. */
export type ErrorVisibility = {
  isBlurred: boolean;
  submissionAttempts: number;
};

/** A validator's error as text: a string, or a Standard Schema issue. */
const messageOf = (error: unknown): string | null => {
  if (typeof error === "string") {
    return error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return null;
};

/**
 * The errors an AOF field shows (ADR 0017): none until the field is left or a
 * submit is tried, then every message, so it follows the typing and clears
 * the moment the value is valid. Anything without a message shows nothing.
 */
export const shownErrors = (
  errors: readonly unknown[],
  { isBlurred, submissionAttempts }: ErrorVisibility
): FieldMessage[] => {
  if (!(isBlurred || submissionAttempts > 0)) {
    return [];
  }
  return errors.flatMap((error) => {
    const message = messageOf(error);
    return message ? [{ message }] : [];
  });
};
