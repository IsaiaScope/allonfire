import { Hono } from "hono";
import { INFRA_ROUTE } from "../../shared/constants/routes";
import { healthHandler, readyHandler } from "./handlers";
import { healthRoute, readyRoute } from "./routes";
import type { HealthDeps } from "./utils/status";

export const healthRoutes = (deps: HealthDeps) =>
  new Hono()
    .get(INFRA_ROUTE.HEALTH, healthRoute, healthHandler)
    .get(INFRA_ROUTE.READY, readyRoute, readyHandler(deps));
