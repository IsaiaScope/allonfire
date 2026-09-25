import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { z } from "zod";

/**
 * The readiness vocabulary is a client contract — orchestrators branch on
 * these strings. `healthBodySchema` and the two ready body schemas below are
 * the response shapes the routes must satisfy, one per status code, so the
 * OpenAPI document never pairs `degraded` with a 503 or `unavailable` with a
 * 200.
 */
export const READY_STATUS = {
  DEGRADED: "degraded",
  OK: "ok",
  UNAVAILABLE: "unavailable",
} as const;

export const CHECK_STATUS = {
  OK: "ok",
  UNREACHABLE: "unreachable",
} as const;

export const checkStatusSchema = z.enum(CHECK_STATUS);
export type CheckStatus = z.infer<typeof checkStatusSchema>;

export const healthBodySchema = z.object({
  status: z.literal(READY_STATUS.OK),
  uptime: z.number(),
  version: z.string(),
});

/** 200: Postgres answers; Redis down only degrades. */
export const readyServingBodySchema = z.object({
  checks: z.object({
    database: z.literal(CHECK_STATUS.OK),
    redis: checkStatusSchema,
  }),
  status: z.enum([READY_STATUS.DEGRADED, READY_STATUS.OK]),
});

/** 503: Postgres is unreachable, whatever Redis says. */
export const readyUnavailableBodySchema = z.object({
  checks: z.object({
    database: z.literal(CHECK_STATUS.UNREACHABLE),
    redis: checkStatusSchema,
  }),
  status: z.literal(READY_STATUS.UNAVAILABLE),
});

export type HealthBody = z.infer<typeof healthBodySchema>;
export type ReadyServingBody = z.infer<typeof readyServingBodySchema>;
export type ReadyUnavailableBody = z.infer<typeof readyUnavailableBodySchema>;

/** Postgres is required; Redis failing open must not pull a healthy container. */
export const READY_STATUS_CODE = {
  NOT_READY: HTTP_STATUS.SERVICE_UNAVAILABLE,
  READY: HTTP_STATUS.OK,
} as const;

export const PROBE_DESCRIPTION = {
  HEALTH_200: "Process is alive",
  HEALTH_DESCRIPTION: "Touches no dependencies. Reports the running build.",
  HEALTH_SUMMARY: "Liveness probe",
  READY_200: "Ready, possibly degraded",
  READY_503: "Postgres unreachable",
  READY_DESCRIPTION:
    "Pings Postgres and Redis. 503 only when Postgres is unreachable.",
  READY_SUMMARY: "Readiness probe",
} as const;
