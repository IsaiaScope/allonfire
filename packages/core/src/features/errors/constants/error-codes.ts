/**
 * The error codes every Host and module shares: the machine-readable half of
 * an error, which a client switches on. A module that needs a code of its own
 * adds it to its own object (`IMAGE.ERROR_CODE`, `AUTH.ERROR_CODE`); a Host
 * answers with these plus those of the modules it mounts, and owns each
 * code's message and status (ADR 0015).
 */
export const ERROR = {
  CODE: {
    BAD_REQUEST: "BAD_REQUEST",
    FORBIDDEN: "FORBIDDEN",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    NOT_FOUND: "NOT_FOUND",
    PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    RATE_LIMITED: "RATE_LIMITED",
    TIMEOUT: "TIMEOUT",
    UNAUTHORIZED: "UNAUTHORIZED",
    VALIDATION_FAILED: "VALIDATION_FAILED",
  },
} as const;
