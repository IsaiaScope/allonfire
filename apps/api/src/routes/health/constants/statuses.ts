import { z } from "zod";
import { HTTP_STATUS } from "../../../shared/constants/http";

/**
 * The readiness vocabulary is a client contract — orchestrators branch on
 * these strings — so it is a zod enum, not a bare union. `healthBodySchema`
 * and `readyBodySchema` below are the response shapes the routes must satisfy.
 */
export const READY_STATUS = {
  DEGRADED: "degraded",
  OK: "ok",
  UNAVAILABLE: "unavailable",
} as const;

export const readyStatusSchema = z.enum(READY_STATUS);
export type ReadyStatus = z.infer<typeof readyStatusSchema>;

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

export const readyBodySchema = z.object({
  checks: z.object({
    database: checkStatusSchema,
    redis: checkStatusSchema,
  }),
  status: readyStatusSchema,
});

export type HealthBody = z.infer<typeof healthBodySchema>;
export type ReadyBody = z.infer<typeof readyBodySchema>;

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
