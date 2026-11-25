import { HTTP } from "@allonfire/core/features/http/constants/http";

/**
 * The probes' vocabulary: what `/health` and `/ready` answer, and how the docs
 * describe them. The readiness strings are a client contract, orchestrators
 * branch on them; `utils/health-schema.ts` holds the response shapes the routes
 * must satisfy, one per status code, so the OpenAPI document never pairs
 * `degraded` with a 503 or `unavailable` with a 200.
 */
export const HEALTH = {
  CHECK: {
    STATUS: {
      OK: "ok",
      UNREACHABLE: "unreachable",
    },
  },
  PROBE_DESCRIPTION: {
    HEALTH: {
      DESCRIPTION:
        "Answers while the process runs and touches no dependency, so a slow database never restarts the container. Reports the running version and uptime in seconds.",
      RESPONSE: { [HTTP.STATUS.OK]: "Process is alive" },
      SUMMARY: "Liveness probe",
    },
    READY: {
      DESCRIPTION:
        "Pings Postgres and Redis. Redis down only degrades, since rate limits fail open. 503 only when Postgres is unreachable, so traffic stops reaching an instance that cannot serve it.",
      RESPONSE: {
        [HTTP.STATUS.OK]: "Ready; `degraded` when Redis is down",
        [HTTP.STATUS.SERVICE_UNAVAILABLE]: "Postgres unreachable",
      },
      SUMMARY: "Readiness probe",
    },
  },
  READY: {
    /** Postgres is required; Redis failing open must not pull a healthy container. */
    HTTP_STATUS: {
      NOT_READY: HTTP.STATUS.SERVICE_UNAVAILABLE,
      READY: HTTP.STATUS.OK,
    },
    STATUS: {
      DEGRADED: "degraded",
      OK: "ok",
      UNAVAILABLE: "unavailable",
    },
  },
} as const;
