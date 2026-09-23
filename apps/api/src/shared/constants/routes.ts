import { objectValues } from "@allonfire/utils/object";

/** Where sub-routers mount onto the base app. */
export const ROOT_PATH = "/";

/** Domain routes mount here; `/health` and `/ready` stay unversioned. */
export const API_VERSION_PREFIX = "/v1";

/**
 * Unversioned infrastructure paths. Orchestrators pin these, so they never
 * move under `/v1`.
 *
 * `PROBE_PATHS` is derived from this object rather than re-typed, so it cannot
 * drift from the paths the health router serves.
 */
export const INFRA_ROUTE = {
  HEALTH: "/health",
  READY: "/ready",
} as const;

export const PROBE_PATHS: ReadonlySet<string> = new Set(
  objectValues(INFRA_ROUTE)
);
