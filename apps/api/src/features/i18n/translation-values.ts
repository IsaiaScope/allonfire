// What each message interpolates, read off the ICU strings in translations/en.json.
// `never` means the message takes no values, which makes the argument illegal
// in `translate` rather than optional.

export type TranslationValues = {
  BAD_REQUEST: never;
  VALIDATION_FAILED: { count: number };
  UNAUTHORIZED: never;
  FORBIDDEN: never;
  NOT_FOUND: never;
  RATE_LIMITED: { seconds: number };
  TIMEOUT: { seconds: number };
  PAYLOAD_TOO_LARGE: { limit: number };
  INTERNAL_ERROR: never;
};
