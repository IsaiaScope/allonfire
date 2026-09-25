import { Hono } from "hono";
import type { AuthLike } from "../../shared/types/auth";
import { AUTH_METHODS } from "./constants/http";

/** Mount at the root: the routes already sit under the instance's `basePath`. */
export const authRoutes = (auth: AuthLike) =>
  new Hono().on([...AUTH_METHODS], `${auth.basePath}/*`, (context) =>
    auth.handler(context.req.raw)
  );
