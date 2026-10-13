import { Hono } from "hono";
import { API } from "../../../shared/constants/api";
import type { HealthDeps } from "../utils/status";
import { healthHandler, readyHandler } from "./handlers";
import { healthRoute, readyRoute } from "./routes";

export const healthRoutes = (deps: HealthDeps) =>
  new Hono()
    .get(API.PATH.HEALTH, healthRoute, healthHandler)
    .get(API.PATH.READY, readyRoute, readyHandler(deps));
