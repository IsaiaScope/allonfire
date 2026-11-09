import { authEnvSchema } from "@allonfire/auth/environment/environment";
import { runtimeEnvSchema } from "@allonfire/core/environment/environment";
import { telemetryEnvSchema } from "@allonfire/core/environment/telemetry-environment";
import {
  LOG,
  logLevelSchema,
} from "@allonfire/core/features/logger/constants/logger";
import { booleanEnvSchema, ENV } from "@allonfire/core/shared/constants/env";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { databaseEnvSchema } from "@allonfire/database/environment/environment";
import { storageEnvSchema } from "@allonfire/storage/environment/environment";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { RATE_LIMIT } from "../features/rate-limit/constants/limits";
import { TELEMETRY } from "../features/telemetry/constants/telemetry";
import { API } from "../shared/constants/api";

/**
 * The API's env, parsed and checked from `raw`.
 * @internal
 */
export function parseEnv(raw: Record<string, string | undefined>) {
  return createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv: raw,
    server: {
      ...runtimeEnvSchema,
      ...databaseEnvSchema,
      ...authEnvSchema,
      ...storageEnvSchema,
      API_CORS_ORIGINS: z.string().transform((value) =>
        value
          .split(SEPARATOR.LIST)
          .map((origin) => origin.trim())
          .filter(Boolean)
      ),
      API_ENABLE_DOCS: booleanEnvSchema
        .default(ENV.BOOLEAN.FALSE)
        .transform((value) => value === ENV.BOOLEAN.TRUE),
      /** Where the keep-alive sends its check emails: the owner's address. */
      API_KEEP_ALIVE_RECIPIENT: z.email().optional(),
      /** The workflow service's token for the keep-alive; unset, it refuses everyone. */
      API_KEEP_ALIVE_TOKEN: z.string().min(32).optional(),
      API_LOG_LEVEL: logLevelSchema.default(LOG.LEVEL.INFO),
      API_RATE_LIMIT_MAX: z.coerce
        .number()
        .int()
        .positive()
        .default(RATE_LIMIT.DEFAULT.MAX),
      API_RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(RATE_LIMIT.DEFAULT.WINDOW_MS),
      API_REDIS_URL: z.url(),
      API_TRUSTED_PROXY_HOPS: z.coerce
        .number()
        .int()
        .min(0)
        .default(RATE_LIMIT.DEFAULT.TRUSTED_PROXY_HOPS),
      PORT: z.coerce.number().int().positive().default(API.DEFAULT.PORT),
      // The OTLP endpoint and headers, both optional (core's schemas), and
      // the name the API's telemetry is filed under.
      ...telemetryEnvSchema,
      TELEMETRY_SERVICE_NAME: z
        .string()
        .default(TELEMETRY.DEFAULT_SERVICE_NAME),
    },
  });
}

export const env = parseEnv(process.env);
