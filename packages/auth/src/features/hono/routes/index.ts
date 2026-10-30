import { Hono } from "hono";
import { AUTH } from "../../../shared/constants/auth";
import type { AuthLike } from "../../../shared/types/auth";

/** Mount at the root: the routes already sit under the instance's `basePath`. */
export const authRoutes = (auth: AuthLike) =>
  new Hono().on([...AUTH.METHODS], `${auth.basePath}/*`, (context) =>
    auth.handler(context.req.raw)
  );
