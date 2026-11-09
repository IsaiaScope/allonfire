import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { TELEMETRY } from "../features/telemetry/constants/telemetry";
import { PATTERN } from "../shared/constants/patterns";
import { SEPARATOR } from "../shared/constants/separators";
import { objectFromEntries } from "../shared/utils/object";
import { runtimeEnvSchema } from "./environment";

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

/**
 * The OTLP endpoint (unset switches telemetry off) and its headers, both
 * optional: a Host without them runs and ships nothing. Spread into an env's
 * `server`; the exporters get them from there, never the SDK's own `OTEL_*`
 * lookup. A Host adds its own `TELEMETRY_SERVICE_NAME`, with its own default.
 */
export const telemetryEnvSchema = {
  TELEMETRY_ENDPOINT: z
    .url({ protocol: PATTERN.TELEMETRY.PROTOCOL })
    .transform((url) => url.replace(PATTERN.TRAILING_SLASHES, ""))
    .optional(),
  TELEMETRY_HEADERS: z
    .string()
    .regex(PATTERN.TELEMETRY.HEADERS)
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
};

/**
 * A Next App server's telemetry, read from process.env: core's two keys, the
 * name it is filed under (`TELEMETRY.DEFAULT.SERVICE_NAME` unless set) and
 * `NODE_ENV`. Every key is optional, so `next build`, Local and the tests run
 * with none set and ship nothing. An App extends its env with it
 * (`extends: [telemetryEnv]`); core's `serverLogger` reads it.
 */
export const telemetryEnv = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    ...runtimeEnvSchema,
    ...telemetryEnvSchema,
    TELEMETRY_SERVICE_NAME: z
      .string()
      .min(1)
      .default(TELEMETRY.DEFAULT.SERVICE_NAME),
  },
});
