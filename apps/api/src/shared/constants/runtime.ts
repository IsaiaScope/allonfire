import type { ElementOf } from "@allonfire/utils/object";
import { z } from "zod";

/** Mirrors pino's levels: fatal, error, warn, info, debug, trace, loudest first. */
export const LOG_LEVEL = {
  DEBUG: "debug",
  ERROR: "error",
  FATAL: "fatal",
  INFO: "info",
  TRACE: "trace",
  WARN: "warn",
} as const;

export const logLevelSchema = z.enum(LOG_LEVEL);
export type LogLevel = z.infer<typeof logLevelSchema>;

/**
 * Paths pino scrubs before anything reaches a transport. Add to this list, not
 * to a call site — a redaction applied at one log statement is one that the
 * next statement forgets.
 */
export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.token",
] as const;

export const REDACT_CENSOR = "[Redacted]";

/**
 * The only request headers the request log records. An allowlist, not a
 * denylist: request lines ship to OpenObserve, and a header added later should
 * have to earn its place.
 */
export const LOGGED_REQUEST_HEADERS = [
  "accept-language",
  "content-length",
  "content-type",
] as const;

/** Log messages emitted outside a request, where there is no requestId. */
export const LOG_MESSAGE = {
  CRASHED: "uncaught error, exiting",
  DRAIN_TIMEOUT: "drain timed out, closing dependencies anyway",
  LISTENING: "api listening",
  NON_ERROR_THROWN: "a non-Error value was thrown",
  RATE_LIMIT_STORE_DOWN: "rate limit store unreachable, failing open",
  RATE_LIMIT_STORE_RECOVERED: "rate limit store recovered",
  REDIS_DOWN: "redis unreachable",
  REDIS_RECOVERED: "redis reconnected",
  SECOND_SIGNAL: "second signal, exiting immediately",
  SHUTDOWN_COMPLETE: "shutdown complete",
  SHUTDOWN_STEP_FAILED: "shutdown step failed",
  SHUTTING_DOWN: "shutting down",
  TELEMETRY_FLUSH_ABANDONED:
    "telemetry flush failed or timed out, spans dropped",
  UNHANDLED_ERROR: "unhandled error",
} as const;

export const SHUTDOWN_SIGNAL = ["SIGTERM", "SIGINT"] as const;
export type ShutdownSignal = ElementOf<typeof SHUTDOWN_SIGNAL>;

/**
 * Names reported in the shutdown log line. Typed rather than `string[]` so a
 * step added here without a matching close call fails to compile.
 */
export const SHUTDOWN_STEP = {
  DATABASE: "database",
  REDIS: "redis",
  SERVER: "server",
  TELEMETRY: "telemetry",
} as const;

export const shutdownStepSchema = z.enum(SHUTDOWN_STEP);
export type ShutdownStep = z.infer<typeof shutdownStepSchema>;

/**
 * Keys written into Hono's context. Used both as the literal passed to
 * `context.get`/`context.set` and as the key of `AppBindings["Variables"]`, so the two
 * cannot name different things.
 */
export const CONTEXT_VAR = {
  LOCALE: "locale",
  LOGGER: "logger",
  REQUEST_ID: "requestId",
} as const;

/** `ENABLE_DOCS` arrives as a string; these are the two accepted spellings. */
export const BOOLEAN_ENV = { FALSE: "false", TRUE: "true" } as const;
export const booleanEnvSchema = z.enum(BOOLEAN_ENV);

export const SEPARATOR = {
  /** Comma-delimited header values and comma-delimited env lists. */
  LIST: ",",
  /** Splits `key=value` in a key/value env list such as OTLP headers. */
  PAIR: "=",
  /** Joins a zod issue path into `a.b.c`. */
  PATH: ".",
} as const;

/** Exit code after a second signal arrives mid-drain. */
export const FORCED_EXIT_CODE = 1;
export const CLEAN_EXIT_CODE = 0;
/** Exit code after an uncaught error; the orchestrator restarts the container. */
export const CRASH_EXIT_CODE = 1;

export const REDIS_EVENT = {
  ERROR: "error",
  READY: "ready",
} as const;

export const REDIS_STATUS_READY = "ready";
export const REDIS_PING_REPLY = "PONG";
