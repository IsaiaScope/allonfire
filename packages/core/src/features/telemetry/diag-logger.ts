import type { DiagLogger } from "@opentelemetry/api";
import type { Logger } from "pino";

/**
 * OpenTelemetry reports its own failures through `diag`, which discards them
 * until a logger is installed. Without this, a wrong password or a down
 * collector means empty dashboards and no clue why.
 */
export const pinoDiagLogger = (logger: Logger): DiagLogger => ({
  debug: (message, ...args) => logger.debug({ args }, message),
  error: (message, ...args) => logger.error({ args }, message),
  info: (message, ...args) => logger.info({ args }, message),
  verbose: (message, ...args) => logger.trace({ args }, message),
  warn: (message, ...args) => logger.warn({ args }, message),
});
