import { objectValues, type ValueOf } from "@allonfire/utils/object";

/**
 * Unversioned infrastructure paths. Orchestrators pin these, so they never
 * move under `/v1`.
 *
 * `PROBE_PATHS` is derived from this object rather than re-typed: the rate
 * limiter bypasses exactly the paths the health router serves, and deriving it
 * is what keeps the two from drifting when a route is renamed.
 */
export const INFRA_ROUTE = {
  HEALTH: "/health",
  READY: "/ready",
} as const;

export type InfraRoute = ValueOf<typeof INFRA_ROUTE>;

export const PROBE_PATHS: ReadonlySet<string> = new Set(
  objectValues(INFRA_ROUTE)
);
