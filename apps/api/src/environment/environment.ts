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
import { TELEMETRY } from "../features/telemetry/constants/telemetry";
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
      PORT: z.coerce.number().int().positive().default(API.DEFAULT.PORT),
      // The OTLP endpoint (unset switches telemetry off), its headers and the
      // service name; the exporters get them from here, never the SDK's own
      // OTEL_* lookup.
      TELEMETRY_ENDPOINT: z
        .url({ protocol: TELEMETRY.PATTERN.PROTOCOL })
        .transform((url) => url.replace(PATTERN.TRAILING_SLASHES, ""))
        .optional(),
      TELEMETRY_HEADERS: z
        .string()
        .regex(TELEMETRY.PATTERN.HEADERS)
        // `decodeURIComponent` throws on a bad escape (`%E0`); report it as an
        // env issue so boot fails with the same message as any other typo.
        .transform((value, context) => {
          try {
            return parseHeaderList(value);
          } catch {
            context.addIssue({
              code: "custom",
              message: TELEMETRY.ERROR.HEADERS_MALFORMED_ESCAPE,
            });
            return z.NEVER;
          }
        })
        .default({}),
      TELEMETRY_SERVICE_NAME: z
        .string()
        .default(TELEMETRY.DEFAULT_SERVICE_NAME),
    },
  });
}

export type Env = ReturnType<typeof parseEnv>;

export const env = parseEnv(process.env);
