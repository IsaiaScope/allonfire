import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import pkg from "../../../package.json" with { type: "json" };
import { OPENAPI_TAG } from "../docs/constants/openapi";
import { INFRA_ROUTE } from "./constants/routes";
import {
  CHECK_STATUS,
  type CheckStatus,
  type HealthBody,
  PROBE_DESCRIPTION,
  READY_STATUS,
  READY_STATUS_CODE,
  type ReadyBody,
  type ReadyStatus,
} from "./constants/statuses";

function readyStatus(database: boolean, redis: boolean): ReadyStatus {
  if (!database) {
    return READY_STATUS.UNAVAILABLE;
  }
  return redis ? READY_STATUS.OK : READY_STATUS.DEGRADED;
}

const checkStatus = (reachable: boolean): CheckStatus =>
  reachable ? CHECK_STATUS.OK : CHECK_STATUS.UNREACHABLE;

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export const createHealthRoutes = (deps: HealthDeps) =>
  new Hono()
    .get(
      INFRA_ROUTE.HEALTH,
      describeRoute({
        summary: PROBE_DESCRIPTION.HEALTH_SUMMARY,
        description: PROBE_DESCRIPTION.HEALTH_DESCRIPTION,
        tags: [OPENAPI_TAG.INFRASTRUCTURE],
        responses: {
          [READY_STATUS_CODE.READY]: {
            description: PROBE_DESCRIPTION.HEALTH_200,
          },
        },
      }),
      (context) => {
        // `as const satisfies`, never a bare annotation: `satisfies` checks
        // the shape against the schema while keeping the literal/readonly
        // inference that `hc<AppType>` hands to consumers. An annotation
        // checks the same thing but widens the client contract.
        const body = {
          status: READY_STATUS.OK,
          version: pkg.version,
          uptime: process.uptime(),
        } as const satisfies HealthBody;
        return context.json(body);
      }
    )
    .get(
      INFRA_ROUTE.READY,
      describeRoute({
        summary: PROBE_DESCRIPTION.READY_SUMMARY,
        description: PROBE_DESCRIPTION.READY_DESCRIPTION,
        tags: [OPENAPI_TAG.INFRASTRUCTURE],
        responses: {
          [READY_STATUS_CODE.READY]: {
            description: PROBE_DESCRIPTION.READY_200,
          },
          [READY_STATUS_CODE.NOT_READY]: {
            description: PROBE_DESCRIPTION.READY_503,
          },
        },
      }),
      async (context) => {
        const [database, redis] = await Promise.all([
          deps.checkDatabase().catch(() => false),
          deps.checkRedis().catch(() => false),
        ]);

        const body = {
          status: readyStatus(database, redis),
          checks: {
            database: checkStatus(database),
            redis: checkStatus(redis),
          },
        } as const satisfies ReadyBody;

        // Postgres is required; Redis failing open must not remove a container
        // that is still serving traffic correctly.
        return context.json(
          body,
          database ? READY_STATUS_CODE.READY : READY_STATUS_CODE.NOT_READY
        );
      }
    );
