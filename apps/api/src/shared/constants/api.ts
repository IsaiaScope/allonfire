import { USER } from "@allonfire/auth/features/users/constants/users";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { BACK_OFFICE } from "../../features/back-office/constants/back-office";
import { LAURA } from "../../features/laura/constants/laura";
import { SERVICES } from "../../features/services/constants/services";
import { API_ERROR } from "./error";

/** The version the API serves today, written once: a new one changes this line only. */
const CURRENT_VERSION = "v1";
/** Domain routes mount here; `/health` and `/ready` stay unversioned. */
const VERSION_PATH = `/${CURRENT_VERSION}` as const;
/** Laura's own data: routes its Members call (ADR 0035). */
const LAURA_PATH = `${VERSION_PATH}${LAURA.PATH.BASE}` as const;
/** The admin console: routes only Back Office Admins call (ADR 0035). */
const BACK_OFFICE_PATH = `${VERSION_PATH}${BACK_OFFICE.PATH.BASE}` as const;
/** The two overviews mount under one prefix. */
const OVERVIEW_PATH =
  `${BACK_OFFICE_PATH}${BACK_OFFICE.OVERVIEW.PATH.BASE}` as const;
/** Unversioned: orchestrators pin the probes, so they never move under the version. */
const HEALTH_PATH = "/health";
const READY_PATH = "/ready";
/** Derived from the paths the health router serves, so it cannot drift from them. */
const PROBE_PATHS: ReadonlySet<string> = new Set([HEALTH_PATH, READY_PATH]);

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
  },
  /** Log messages emitted outside a request, where there is no requestId. */
  LOG_MESSAGE: {
    CRASHED: "uncaught error, exiting",
    DATABASE_DOWN: "database unreachable, not ready",
    DATABASE_RECOVERED: "database reachable again",
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
    TRANSLATION_FAILED: "translation failed, serving the English source",
    UNHANDLED_ERROR: "unhandled error",
  },
  PATH: {
    /** Where the Auth module is mounted and what `createAuth` gets as `basePath`. */
    AUTH: `${VERSION_PATH}${AUTH.PATH.BASE}`,
    /** The admin console (ADR 0035): its own prefix, the Users routes and the two overviews. */
    BACK_OFFICE: {
      BASE: BACK_OFFICE_PATH,
      /** The two overviews, one prefix for both. */
      OVERVIEW: {
        BASE: OVERVIEW_PATH,
        /** The Storage overview. */
        STORAGE: `${OVERVIEW_PATH}${BACK_OFFICE.OVERVIEW.STORAGE.PATH.BASE}`,
        /** The Users overview. */
        USERS: `${OVERVIEW_PATH}${BACK_OFFICE.OVERVIEW.USERS.PATH.BASE}`,
      },
      /** Where the User module mounts. */
      USERS: `${BACK_OFFICE_PATH}${USER.PATH.BASE}`,
    },
    HEALTH: HEALTH_PATH,
    /** Where the Image module mounts. */
    IMAGES: `${VERSION_PATH}${STORAGE.PATH.IMAGES}`,
    /** Laura's own routes (ADR 0035): its prefix, the Favorites list and the Gallery list. */
    LAURA: {
      BASE: LAURA_PATH,
      /** The Favorites list, and one Favorite's write at `FAVORITES` + `/:imageId`. */
      FAVORITES: `${LAURA_PATH}${LAURA.FAVORITES.PATH.BASE}`,
      /** The Gallery list. */
      GALLERY: `${LAURA_PATH}${LAURA.GALLERY.PATH.BASE}`,
      /** Memory: the deck draw, the score write and the leaderboard read. */
      GAMES: {
        DECK: `${LAURA_PATH}${LAURA.GAMES.PATH.BASE}${LAURA.GAMES.PATH.DECK}`,
        LEADERBOARD: `${LAURA_PATH}${LAURA.GAMES.PATH.BASE}${LAURA.GAMES.PATH.LEADERBOARD}`,
        SCORES: `${LAURA_PATH}${LAURA.GAMES.PATH.BASE}${LAURA.GAMES.PATH.SCORES}`,
      },
    },
    /** The OpenAPI document, and the URL the reference page fetches. */
    OPENAPI: "/openapi.json",
    READY: READY_PATH,
    REFERENCE: "/reference",
    /** Where sub-routers mount onto the base app. */
    ROOT: "/",
    /** Where the Services routes mount. */
    SERVICES: `${VERSION_PATH}${SERVICES.PATH.BASE}`,
    /** The version prefix every domain route mounts under. */
    VERSION: VERSION_PATH,
  },
  /** What tracing, rate limiting and info-level logging skip: the probes' own traffic. */
  PROBE: { PATHS: PROBE_PATHS },
  /** The key of each mount under `client.v1`, for a typed client that reads it as a property. */
  SEGMENT: { BACK_OFFICE: BACK_OFFICE.SEGMENT, LAURA: LAURA.SEGMENT },
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
