import { createLogger as createCoreLogger } from "@allonfire/core/features/logger/create-logger";
import { otlpTargetFrom } from "@allonfire/core/features/telemetry/otlp";
import { ENV } from "@allonfire/core/shared/constants/env";
import type { DestinationStream, Logger } from "pino";
import pkg from "../../../package.json" with { type: "json" };
import { env } from "../../environment/environment";

/**
 * The API's logger: core's factory with the API's env. Lines ship to the
 * collector only when `TELEMETRY_ENDPOINT` is set; a `destination` (tests)
 * takes every line instead.
 * @internal
 */
export function createLogger(opts?: {
  destination?: DestinationStream;
}): Logger {
  const otlp = otlpTargetFrom(env);
  return createCoreLogger({
    development: env.NODE_ENV === ENV.NODE.DEVELOPMENT,
    level: env.API_LOG_LEVEL,
    serviceVersion: pkg.version,
    ...(otlp && { otlp }),
    ...(opts?.destination && { destination: opts.destination }),
  });
}

export const logger = createLogger();
