import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { z } from "zod";
import { API_ERROR } from "./error";

/** The version the API serves today, written once: a new one changes this line only. */
const CURRENT_VERSION = "v1";
/** Domain routes mount here; `/health` and `/ready` stay unversioned. */
const VERSION_PATH = `/${CURRENT_VERSION}` as const;
/** Unversioned: orchestrators pin the probes, so they never move under the version. */
const HEALTH = "/health";
const READY = "/ready";

/**
 * Everything about the API that is the same wherever the process runs: its
 * paths, its version and its tunables. What a deployment varies belongs in
 * `src/environment` instead; `DEFAULT` holds what the env falls back to.
 */
export const API = {
  /**
   * Keys written into Hono's context. Used both as the literal passed to
   * `context.get`/`context.set` and as the key of `AppBindings["Variables"]`,
   * so the two cannot name different things.
   */
  CONTEXT_VAR: {
    LOCALE: "locale",
    LOGGER: "logger",
    REQUEST_ID: "requestId",
  },
  DEFAULT: {
    /** How long in-flight requests get to finish before dependencies close. */
    DRAIN_TIMEOUT_MS: 10 * UNIT.MS_PER_SECOND,
    PORT: 3300,
  },
  /** The codes and statuses of the API's error responses (`./error`). */
  ERROR: API_ERROR,
  /** What the process exits with; the orchestrator restarts the container on a non-zero one. */
  EXIT_CODE: {
    CLEAN: 0,
    /** After an uncaught error. */
    CRASH: 1,
    /** After a second signal arrives mid-drain. */
    FORCED: 1,
  },
  LIMIT: {
    /** Request body ceiling. Larger bodies get 413 before a handler sees them. */
    BODY_BYTES: UNIT.BYTES_PER_MIB,
    REQUEST_TIMEOUT_MS: 30 * UNIT.MS_PER_SECOND,
    /**
     * How long the final telemetry flush is allowed to take. The OTLP exporter
     * retries an unreachable collector for ~8s; tsx watch force-kills after 5s
     * and Docker after 10s, so the flush gets less than either.
     */
    TELEMETRY_FLUSH_TIMEOUT_MS: 2 * UNIT.MS_PER_SECOND,
  },
  /** Log messages emitted outside a request, where there is no requestId. */
  LOG_MESSAGE: {
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
  },
  /**
   * The only request headers the request log records. An allowlist, not a
   * denylist: request lines ship to OpenObserve, and a header added later
   * should have to earn its place.
   */
  LOGGED_REQUEST_HEADERS: [
    HTTP.HEADER.ACCEPT_LANGUAGE,
    HTTP.HEADER.CONTENT_LENGTH,
    HTTP.HEADER.CONTENT_TYPE,
  ],
  PATH: {
    /** Where the Auth module is mounted and what `createAuth` gets as `basePath`. */
    AUTH: `${VERSION_PATH}${AUTH.PATH.BASE}`,
    HEALTH,
    /** Where the Image module mounts. */
    IMAGES: `${VERSION_PATH}${STORAGE.PATH.IMAGES}`,
    /** The OpenAPI document, and the URL the reference page fetches. */
    OPENAPI: "/openapi.json",
    READY,
    REFERENCE: "/reference",
    /** Where sub-routers mount onto the base app. */
    ROOT: "/",
    /** The version prefix every domain route mounts under. */
    VERSION: VERSION_PATH,
  },
  SHUTDOWN: {
    SIGNAL: ["SIGTERM", "SIGINT"],
    /**
     * Names reported in the shutdown log line. Typed rather than `string[]` so
     * a step added here without a matching close call fails to compile.
     */
    STEP: {
      DATABASE: "database",
      REDIS: "redis",
      SERVER: "server",
      TELEMETRY: "telemetry",
    },
  },
  VERSION: { CURRENT: CURRENT_VERSION },
} as const;

export const shutdownStepSchema = z.enum(API.SHUTDOWN.STEP);
export type ShutdownStep = z.infer<typeof shutdownStepSchema>;

/** Derived from the paths the health router serves, so it cannot drift from them. */
export const PROBE_PATHS: ReadonlySet<string> = new Set([HEALTH, READY]);
