import { z } from "zod";
import { AUTH } from "../shared/constants/auth";

/** Spread into a host's env `server` block. */
export const authEnvSchema = {
  /**
   * The parent domain the Session cookies are set for (`.isaiariva.com`), so
   * the browser sends them to the API from every App on it. Unset locally:
   * `localhost` cookies already reach every port.
   */
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  AUTH_RATE_LIMIT_KEY_PREFIX: z
    .string()
    .min(1)
    .default(AUTH.RATE_LIMIT.DEFAULT.KEY_PREFIX),
  AUTH_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(AUTH.RATE_LIMIT.DEFAULT.MAX),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(AUTH.RATE_LIMIT.DEFAULT.WINDOW_MS),
  AUTH_SECRET: z.string().min(AUTH.SECRET_MIN_LENGTH),
  AUTH_URL: z.url(),
};
