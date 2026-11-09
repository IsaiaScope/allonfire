import type { Context } from "hono";
import type { Logger } from "pino";
import pkg from "../../../../package.json" with { type: "json" };
import { API } from "../../../shared/constants/api";
import { outageLatch } from "../../../shared/utils/outage";
import { logger as defaultLogger } from "../../logger/logger";
import {
  HEALTH,
  type HealthBody,
  type ReadyServingBody,
  type ReadyUnavailableBody,
} from "../constants/statuses";
import { checkStatus, type HealthDeps } from "../utils/status";

// `as const satisfies`, never a bare annotation: `satisfies` checks the shape
// against the schema while keeping the literal/readonly inference that
// `hc<AppType>` hands to consumers. An annotation checks the same thing but
// widens the client contract.

export const healthHandler = (context: Context) => {
  const body = {
    status: HEALTH.READY_STATUS.OK,
    uptime: process.uptime(),
    version: pkg.version,
  } as const satisfies HealthBody;
  return context.json(body);
};

/**
 * Probes call `/ready` every few seconds: a database outage is logged once
 * when it starts and once when it ends, with the cause. A Redis outage is
 * already logged by the client's own latch (`watchRedis`).
 */
export const readyHandler = (
  deps: HealthDeps,
  logger: Logger = defaultLogger
) => {
  const latch = outageLatch(logger, {
    down: API.LOG_MESSAGE.DATABASE_DOWN,
    recovered: API.LOG_MESSAGE.DATABASE_RECOVERED,
  });
  const checkDatabase = () =>
    deps.checkDatabase().then(
      (reachable) => {
        if (reachable) {
          latch.ok();
        }
        return reachable;
      },
      (err: unknown) => {
        latch.fail(err);
        return false;
      }
    );

  return async (context: Context) => {
    const [database, redis] = await Promise.all([
      checkDatabase(),
      deps.checkRedis().catch(() => false),
    ]);

    // Postgres is required; Redis failing open must not remove a container
    // that is still serving traffic correctly.
    if (!database) {
      const body = {
        checks: {
          database: HEALTH.CHECK_STATUS.UNREACHABLE,
          redis: checkStatus(redis),
        },
        status: HEALTH.READY_STATUS.UNAVAILABLE,
      } as const satisfies ReadyUnavailableBody;
      return context.json(body, HEALTH.READY_STATUS_CODE.NOT_READY);
    }

    const body = {
      checks: { database: HEALTH.CHECK_STATUS.OK, redis: checkStatus(redis) },
      status: redis ? HEALTH.READY_STATUS.OK : HEALTH.READY_STATUS.DEGRADED,
    } as const satisfies ReadyServingBody;
    return context.json(body, HEALTH.READY_STATUS_CODE.READY);
  };
};
