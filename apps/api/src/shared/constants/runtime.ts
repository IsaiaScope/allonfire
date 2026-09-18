import type { ElementOf } from "@allonfire/utils/object";
import { z } from "zod";

/**
 * `NODE_ENV` was compared against bare literals in three files (env schema,
 * logger transport, docs gate). One enum here means a typo is a type error
 * instead of a branch that never fires.
 */
export const NODE_ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

export const nodeEnvSchema = z.enum(NODE_ENV);
export type NodeEnv = z.infer<typeof nodeEnvSchema>;

/** Mirrors pino's levels. Ordered loudest to quietest. */
export const LOG_LEVEL = {
  FATAL: "fatal",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
  TRACE: "trace",
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

/** Log messages emitted outside a request, where there is no requestId. */
export const LOG_MESSAGE = {
  LISTENING: "api listening",
  UNHANDLED_ERROR: "unhandled error",
  SHUTTING_DOWN: "shutting down",
  SHUTDOWN_COMPLETE: "shutdown complete",
  SHUTDOWN_STEP_FAILED: "shutdown step failed",
  SECOND_SIGNAL: "second signal, exiting immediately",
  DRAIN_TIMEOUT: "drain timed out, closing dependencies anyway",
} as const;

export const SHUTDOWN_SIGNAL = ["SIGTERM", "SIGINT"] as const;
export type ShutdownSignal = ElementOf<typeof SHUTDOWN_SIGNAL>;

/**
 * Names reported in the shutdown log line. Typed rather than `string[]` so a
 * step added here without a matching close call fails to compile.
 */
export const SHUTDOWN_STEP = {
  SERVER: "server",
  REDIS: "redis",
  DATABASE: "database",
} as const;

export const shutdownStepSchema = z.enum(SHUTDOWN_STEP);
export type ShutdownStep = z.infer<typeof shutdownStepSchema>;

/**
 * Keys written into Hono's context. Used both as the literal passed to
 * `context.get`/`context.set` and as the key of `AppBindings["Variables"]`, so the two
 * cannot name different things.
 */
export const CONTEXT_VAR = {
  REQUEST_ID: "requestId",
  LOGGER: "logger",
  LOCALE: "locale",
} as const;

/** `ENABLE_DOCS` arrives as a string; these are the two accepted spellings. */
export const BOOLEAN_ENV = { TRUE: "true", FALSE: "false" } as const;
export const booleanEnvSchema = z.enum(BOOLEAN_ENV);

export const SEPARATOR = {
  /** Comma-delimited header values and comma-delimited env lists. */
  LIST: ",",
  /** Joins a zod issue path into `a.b.c`. */
  PATH: ".",
} as const;

/** Exit code after a second signal arrives mid-drain. */
export const FORCED_EXIT_CODE = 1;
export const CLEAN_EXIT_CODE = 0;

export const REDIS_EVENT = {
  READY: "ready",
  ERROR: "error",
} as const;

export const REDIS_STATUS_READY = "ready";
export const REDIS_PING_REPLY = "PONG";
