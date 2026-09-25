/** Where a host mounts the auth routes, under its own prefix. */
export const AUTH_PATH = "/auth";

/** Better Auth's email and password sign-in. */
export const SIGN_IN_EMAIL_PATH = "/sign-in/email";

/** Takes the current password, so a stolen Session could guess it here. */
export const CHANGE_PASSWORD_PATH = "/change-password";

/**
 * Every route where Better Auth checks a password. Hosts rate-limit these
 * harder than anything else: each request is a guess.
 */
export const LIMITED_AUTH_PATHS = [
  SIGN_IN_EMAIL_PATH,
  CHANGE_PASSWORD_PATH,
] as const;

/** The `openAPI` plugin's HTTP route; disabled, the schema is read in-process. */
export const OPENAPI_SCHEMA_PATH = "/open-api/generate-schema";
