// What each message interpolates, read off the ICU strings in translations/en.json.
// `never` means the message takes no values, which makes the argument illegal
// in `translate` rather than optional.

export type TranslationValues = {
  BAD_REQUEST: never;
  VALIDATION_FAILED: { count: number };
  UNAUTHORIZED: never;
  FORBIDDEN: never;
  RESOURCE_CHANGED: never;
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
  PROVIDER_INCOMPLETE: never;
  INTERNAL_ERROR: never;
  EMAIL_FOOTNOTE: never;
  EMAIL_LINK_EXPIRY: { minutes: number };
  VERIFY_EMAIL_SUBJECT: { app: string };
  VERIFY_EMAIL_HEADING: never;
  VERIFY_EMAIL_BODY: { app: string };
  VERIFY_EMAIL_ACTION: never;
  RESET_PASSWORD_SUBJECT: { app: string };
  RESET_PASSWORD_HEADING: never;
  RESET_PASSWORD_BODY: { app: string };
  RESET_PASSWORD_ACTION: never;
  PROVIDER_CHECK_SUBJECT: { provider: string };
  PROVIDER_CHECK_HEADING: never;
  PROVIDER_CHECK_BODY: { provider: string };
};
