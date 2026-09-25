import { Hono } from "hono";
import { AUTH_METHODS } from "../../constants/http";
import type { AuthLike } from "../../types/auth";

/** Mount at the root: the routes already sit under the instance's `basePath`. */
export const authRoutes = (auth: AuthLike) =>
  new Hono().on([...AUTH_METHODS], `${auth.basePath}/*`, (context) =>
    auth.handler(context.req.raw)
  );
