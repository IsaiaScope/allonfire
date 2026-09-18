import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { DEFAULT_PORT } from "../../shared/constants/limits";
import {
  BOOLEAN_ENV,
  booleanEnvSchema,
  LOG_LEVEL,
  logLevelSchema,
  NODE_ENV,
  nodeEnvSchema,
  SEPARATOR,
} from "../../shared/constants/runtime";
import {
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_TRUSTED_PROXY_HOPS,
} from "../rate-limit/constants/limits";

export function parseEnv(raw: Record<string, string | undefined>) {
  return createEnv({
    server: {
      NODE_ENV: nodeEnvSchema.default(NODE_ENV.DEVELOPMENT),
      PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
      LOG_LEVEL: logLevelSchema.default(LOG_LEVEL.INFO),
      DATABASE_URL: z.url(),
      REDIS_URL: z.url(),
      CORS_ORIGINS: z.string().transform((value) =>
        value
          .split(SEPARATOR.LIST)
          .map((origin) => origin.trim())
          .filter(Boolean)
      ),
      RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(DEFAULT_RATE_LIMIT_WINDOW_MS),
      RATE_LIMIT_MAX: z.coerce
        .number()
        .int()
        .positive()
        .default(DEFAULT_RATE_LIMIT_MAX),
      TRUSTED_PROXY_HOPS: z.coerce
        .number()
        .int()
        .min(0)
        .default(DEFAULT_TRUSTED_PROXY_HOPS),
      ENABLE_DOCS: booleanEnvSchema
        .default(BOOLEAN_ENV.FALSE)
        .transform((value) => value === BOOLEAN_ENV.TRUE),
    },
    runtimeEnv: raw,
    emptyStringAsUndefined: true,
  });
}

export type Env = ReturnType<typeof parseEnv>;

export const env = parseEnv(process.env);
