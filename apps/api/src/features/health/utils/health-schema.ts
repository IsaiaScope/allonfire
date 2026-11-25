import { z } from "zod";
import { HEALTH } from "../constants/statuses";
import { checkStatusSchema } from "../constants/statuses-schema";

export const healthBodySchema = z
  .object({
    status: z.literal(HEALTH.READY.STATUS.OK),
    uptime: z.number(),
    version: z.string(),
  })
  .meta({ ref: "Health" });

/** 200: Postgres answers; Redis down only degrades. */
export const readyServingBodySchema = z
  .object({
    checks: z.object({
      database: z.literal(HEALTH.CHECK.STATUS.OK),
      redis: checkStatusSchema,
    }),
    status: z.enum([HEALTH.READY.STATUS.DEGRADED, HEALTH.READY.STATUS.OK]),
  })
  .meta({ ref: "Ready" });

/** 503: Postgres is unreachable, whatever Redis says. */
export const readyUnavailableBodySchema = z
  .object({
    checks: z.object({
      database: z.literal(HEALTH.CHECK.STATUS.UNREACHABLE),
      redis: checkStatusSchema,
    }),
    status: z.literal(HEALTH.READY.STATUS.UNAVAILABLE),
  })
  .meta({ ref: "ReadyUnavailable" });

export type HealthBody = z.infer<typeof healthBodySchema>;
export type ReadyServingBody = z.infer<typeof readyServingBodySchema>;
export type ReadyUnavailableBody = z.infer<typeof readyUnavailableBodySchema>;
