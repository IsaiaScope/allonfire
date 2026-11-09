import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { SERVICES } from "../constants/services";
import type { ServicesDeps } from "../utils/deps";
import {
  keepAliveHandlers,
  listHandlers,
  providerHandlers,
  serviceHandlers,
  testHandlers,
} from "./handlers";

/**
 * The Services routes: Back Office Admins read and edit the
 * providers and send a test through one; the workflow service calls the keep-alive with
 * its token. The keep-alive is matched before `/:type`, which would take it.
 */
export const servicesRoutes = (deps: ServicesDeps) =>
  new Hono<AuthEnv>()
    .post(SERVICES.PATH.KEEP_ALIVE, ...keepAliveHandlers(deps))
    .get(SERVICES.PATH.LIST, ...listHandlers(deps))
    .patch(SERVICES.PATH.PROVIDER, ...providerHandlers(deps))
    .post(SERVICES.PATH.TEST, ...testHandlers(deps))
    .patch(SERVICES.PATH.SERVICE, ...serviceHandlers(deps));
