import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { env } from "../../environment/environment";

export const corsPolicy = (): MiddlewareHandler =>
  cors({
    // Inert until something sends a cookie, but incompatible with a
    // wildcard origin — setting it now removes a landmine from the
    // auth migration.
    credentials: true,
    origin: env.CORS_ORIGINS,
  });
