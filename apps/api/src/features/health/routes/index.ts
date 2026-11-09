import { Hono } from "hono";
import type { Logger } from "pino";
import { API } from "../../../shared/constants/api";
import type { HealthDeps } from "../utils/status";
import { healthHandler, readyHandler } from "./handlers";
import { healthRoute, readyRoute } from "./routes";

/** `logger` is optional so tests can capture the outage lines. */
export const healthRoutes = (deps: HealthDeps, logger?: Logger) =>
  new Hono()
    .get(API.PATH.HEALTH, healthRoute, healthHandler)
    .get(API.PATH.READY, readyRoute, readyHandler(deps, logger));
