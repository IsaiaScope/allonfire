import { z } from "zod";
import {
  DEFAULT_AUTH_RATE_LIMIT_KEY_PREFIX,
  DEFAULT_AUTH_RATE_LIMIT_MAX,
  DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
  SECRET_MIN_LENGTH,
} from "../constants/limits";

/** Spread into a host's env `server` block. */
export const authEnvSchema = {
  AUTH_RATE_LIMIT_KEY_PREFIX: z
    .string()
    .min(1)
    .default(DEFAULT_AUTH_RATE_LIMIT_KEY_PREFIX),
  AUTH_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_AUTH_RATE_LIMIT_MAX),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS),
  BETTER_AUTH_SECRET: z.string().min(SECRET_MIN_LENGTH),
  BETTER_AUTH_URL: z.url(),
};
