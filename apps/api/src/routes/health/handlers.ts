import type { Context } from "hono";
import pkg from "../../../package.json" with { type: "json" };
import {
  type HealthBody,
  READY_STATUS,
  READY_STATUS_CODE,
  type ReadyBody,
} from "./constants/statuses";
import { checkStatus, type HealthDeps, readyStatus } from "./utils/status";

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

  const body = {
    checks: {
      database: checkStatus(database),
      redis: checkStatus(redis),
    },
    status: readyStatus(database, redis),
  } as const satisfies ReadyBody;

  // Postgres is required; Redis failing open must not remove a container
  // that is still serving traffic correctly.
  return context.json(
    body,
    database ? READY_STATUS_CODE.READY : READY_STATUS_CODE.NOT_READY
  );
};
