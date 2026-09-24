import type { Context } from "hono";
import pkg from "../../../package.json" with { type: "json" };
import {
  CHECK_STATUS,
  type HealthBody,
  READY_STATUS,
  READY_STATUS_CODE,
  type ReadyServingBody,
  type ReadyUnavailableBody,
} from "./constants/statuses";
import { checkStatus, type HealthDeps } from "./utils/status";

// `as const satisfies`, never a bare annotation: `satisfies` checks the shape
// against the schema while keeping the literal/readonly inference that
// `hc<AppType>` hands to consumers. An annotation checks the same thing but
// widens the client contract.

export const healthHandler = (context: Context) => {
  const body = {
    status: READY_STATUS.OK,
    uptime: process.uptime(),
    version: pkg.version,
  } as const satisfies HealthBody;
  return context.json(body);
};

export const readyHandler = (deps: HealthDeps) => async (context: Context) => {
  const [database, redis] = await Promise.all([
    deps.checkDatabase().catch(() => false),
    deps.checkRedis().catch(() => false),
  ]);

  // Postgres is required; Redis failing open must not remove a container
  // that is still serving traffic correctly.
  if (!database) {
    const body = {
      checks: { database: CHECK_STATUS.UNREACHABLE, redis: checkStatus(redis) },
      status: READY_STATUS.UNAVAILABLE,
    } as const satisfies ReadyUnavailableBody;
    return context.json(body, READY_STATUS_CODE.NOT_READY);
  }

  const body = {
    checks: { database: CHECK_STATUS.OK, redis: checkStatus(redis) },
    status: redis ? READY_STATUS.OK : READY_STATUS.DEGRADED,
  } as const satisfies ReadyServingBody;
  return context.json(body, READY_STATUS_CODE.READY);
};
