import { z } from "zod";

/**
 * Better Auth's cookie names start with this, behind `__Secure-` on https;
 * signing out clears every cookie that carries it.
 */
export const AUTH_COOKIE_MARKER = "better-auth.";

/**
 * Better Auth's Session cookies, matched past any `__Secure-` prefix: the
 * signed copy of the Session that spares the API a database read until it
 * expires. The Session itself is read with Better Auth's `getSessionCookie`.
 */
export const AUTH_COOKIE = {
  SESSION_DATA: `${AUTH_COOKIE_MARKER}session_data`,
} as const;

/** Why a sign in failed; an App translates each one. */
export const SIGN_IN_ERROR = {
  /** Signed in, but the User's Role or Allowed apps keep them out. */
  FORBIDDEN: "forbidden",
  INVALID: "invalid",
  /** The email or the password was left empty. */
  MISSING: "missing",
  RATE_LIMITED: "rateLimited",
  UNAVAILABLE: "unavailable",
} as const;

export const signInErrorSchema = z.enum(SIGN_IN_ERROR);
export type SignInError = z.infer<typeof signInErrorSchema>;

/**
 * What the `signIn` action hands back to the form (`useActionState`): why it
 * failed. Nothing comes back on success: the action redirects home.
 */
export type SignInState = { error?: SignInError };
