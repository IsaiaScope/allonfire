/**
 * Every code this module throws (ADR 0015). A host renders and translates
 * them; its type test checks this list against its own codes, so a new one
 * fails the host's build until the host gives it a message.
 */
export const IMAGE_ERROR_CODE = {
  FORBIDDEN: "FORBIDDEN",
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  NOT_FOUND: "NOT_FOUND",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  TIMEOUT: "TIMEOUT",
  UNSUPPORTED_IMAGE: "UNSUPPORTED_IMAGE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;
