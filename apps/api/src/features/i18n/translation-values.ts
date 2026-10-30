// What each message interpolates, read off the ICU strings in translations/en.json.
// `never` means the message takes no values, which makes the argument illegal
// in `translate` rather than optional.

export type TranslationValues = {
  BAD_REQUEST: never;
  VALIDATION_FAILED: { count: number };
  UNAUTHORIZED: never;
  FORBIDDEN: never;
  CANNOT_DELETE_SELF: never;
  CANNOT_CHANGE_OWN_ROLE: never;
  EMAIL_TAKEN: never;
  NOT_FOUND: never;
  RATE_LIMITED: { seconds: number };
  TIMEOUT: { seconds: number };
  PAYLOAD_TOO_LARGE: { limit: number };
  UNSUPPORTED_IMAGE: never;
  IMAGE_TOO_LARGE: { limit: number };
  IMAGE_CHANGED: never;
  INTERNAL_ERROR: never;
};
