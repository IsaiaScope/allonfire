import { z } from "zod";

/** The codes this module adds to Better Auth's own error bodies. */
export const AUTH_ERROR_CODE = {
  /** Sign-in named an App that does not let this User in. */
  APP_FORBIDDEN: "APP_FORBIDDEN",
  /** Registration or joining for an App that does not allow it, or no App named. */
  REGISTRATION_CLOSED: "REGISTRATION_CLOSED",
} as const;

export const authErrorCodeSchema = z.enum(AUTH_ERROR_CODE);
export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
