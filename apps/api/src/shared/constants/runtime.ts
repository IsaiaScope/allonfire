import { HTTP_HEADER } from "@allonfire/utils/constants/http";
import { z } from "zod";

/**
 * The only request headers the request log records. An allowlist, not a
 * denylist: request lines ship to OpenObserve, and a header added later should
 * have to earn its place.
 */
export const LOGGED_REQUEST_HEADERS = [
  HTTP_HEADER.ACCEPT_LANGUAGE,
  HTTP_HEADER.CONTENT_LENGTH,
  HTTP_HEADER.CONTENT_TYPE,
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
