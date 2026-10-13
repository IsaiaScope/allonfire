import { authEnvSchema } from "@allonfire/auth/environment/environment";
import { runtimeEnvSchema } from "@allonfire/core/environment/environment";
import {
  LOG,
  logLevelSchema,
} from "@allonfire/core/features/logger/constants/logger";
import { booleanEnvSchema, ENV } from "@allonfire/core/shared/constants/env";
import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { databaseEnvSchema } from "@allonfire/database/environment/environment";
import { storageEnvSchema } from "@allonfire/storage/environment/environment";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { RATE_LIMIT } from "../features/rate-limit/constants/limits";
import { OTEL, OTLP } from "../features/telemetry/constants/telemetry";
import { API } from "../shared/constants/api";

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
      // Unset switches telemetry off. Named after the OTel spec so the
      // collector docs apply unchanged; app code reads them from here.
      OTEL_EXPORTER_OTLP_ENDPOINT: z
        .url({ protocol: OTLP.PATTERN.PROTOCOL })
        .transform((url) => url.replace(PATTERN.TRAILING_SLASHES, ""))
        .optional(),
      OTEL_EXPORTER_OTLP_HEADERS: z
        .string()
        .regex(OTLP.PATTERN.HEADERS)
        // `decodeURIComponent` throws on a bad escape (`%E0`); report it as an
        // env issue so boot fails with the same message as any other typo.
        .transform((value, context) => {
          try {
            return parseHeaderList(value);
          } catch {
            context.addIssue({
              code: "custom",
              message: OTLP.ERROR.HEADERS_MALFORMED_ESCAPE,
            });
            return z.NEVER;
          }
        })
        .default({}),
      OTEL_SERVICE_NAME: z.string().default(OTEL.DEFAULT_SERVICE_NAME),
      PORT: z.coerce.number().int().positive().default(API.DEFAULT.PORT),
    },
  });
}

export type Env = ReturnType<typeof parseEnv>;

export const env = parseEnv(process.env);
