import { authEnvSchema } from "@allonfire/auth/environment/environment";
import { databaseEnvSchema } from "@allonfire/database/environment/environment";
import { BOOLEAN_ENV, booleanEnvSchema } from "@allonfire/utils/constants/env";
import { LOG_LEVEL, logLevelSchema } from "@allonfire/utils/constants/logger";
import { TRAILING_SLASHES } from "@allonfire/utils/constants/patterns";
import { SEPARATOR } from "@allonfire/utils/constants/separators";
import { runtimeEnvSchema } from "@allonfire/utils/environment/environment";
import { objectFromEntries } from "@allonfire/utils/helpers/object";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import {
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_TRUSTED_PROXY_HOPS,
} from "../features/rate-limit/constants/limits";
import {
  DEFAULT_OTEL_SERVICE_NAME,
  OTLP_HEADERS_MALFORMED_ESCAPE,
  OTLP_HEADERS_PATTERN,
  OTLP_PROTOCOL_PATTERN,
} from "../features/telemetry/constants/telemetry";
import { DEFAULT_PORT } from "../shared/constants/limits";

/** `a=1,b=x%20y` to `{ a: "1", b: "x y" }`, splitting each pair at its first `=`. */
const parseHeaderList = (value: string): Record<string, string> =>
  objectFromEntries(
    value.split(SEPARATOR.LIST).map((pair) => {
      const at = pair.indexOf(SEPARATOR.PAIR);
      return [
        pair.slice(0, at).trim(),
        decodeURIComponent(pair.slice(at + 1).trim()),
      ];
    })
  );

export function parseEnv(raw: Record<string, string | undefined>) {
  return createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv: raw,
    server: {
      ...runtimeEnvSchema,
      ...databaseEnvSchema,
      ...authEnvSchema,
      CORS_ORIGINS: z.string().transform((value) =>
        value
          .split(SEPARATOR.LIST)
          .map((origin) => origin.trim())
          .filter(Boolean)
      ),
      ENABLE_DOCS: booleanEnvSchema
        .default(BOOLEAN_ENV.FALSE)
        .transform((value) => value === BOOLEAN_ENV.TRUE),
      LOG_LEVEL: logLevelSchema.default(LOG_LEVEL.INFO),
      // Unset switches telemetry off. Named after the OTel spec so the
      // collector docs apply unchanged; app code reads them from here.
      OTEL_EXPORTER_OTLP_ENDPOINT: z
        .url({ protocol: OTLP_PROTOCOL_PATTERN })
        .transform((url) => url.replace(TRAILING_SLASHES, ""))
        .optional(),
      OTEL_EXPORTER_OTLP_HEADERS: z
        .string()
        .regex(OTLP_HEADERS_PATTERN)
        // `decodeURIComponent` throws on a bad escape (`%E0`); report it as an
        // env issue so boot fails with the same message as any other typo.
        .transform((value, context) => {
          try {
            return parseHeaderList(value);
          } catch {
            context.addIssue({
              code: "custom",
              message: OTLP_HEADERS_MALFORMED_ESCAPE,
            });
            return z.NEVER;
          }
        })
        .default({}),
      OTEL_SERVICE_NAME: z.string().default(DEFAULT_OTEL_SERVICE_NAME),
      PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
      RATE_LIMIT_MAX: z.coerce
        .number()
        .int()
        .positive()
        .default(DEFAULT_RATE_LIMIT_MAX),
      RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(DEFAULT_RATE_LIMIT_WINDOW_MS),
      REDIS_URL: z.url(),
      TRUSTED_PROXY_HOPS: z.coerce
        .number()
        .int()
        .min(0)
        .default(DEFAULT_TRUSTED_PROXY_HOPS),
    },
  });
}

export type Env = ReturnType<typeof parseEnv>;

export const env = parseEnv(process.env);
