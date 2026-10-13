import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import { Hono } from "hono";
import { API } from "../../../shared/constants/api";
import type { AppBindings } from "../../../shared/types/bindings";
import { referenceHandler, specHandler } from "./handlers";

/** Mount after the routes the spec should describe. */
export const docsRoutes = (app: Hono<AppBindings>, auth: AuthLike) =>
  new Hono<AppBindings>()
    .get(API.PATH.OPENAPI, specHandler(app, auth))
    .get(API.PATH.REFERENCE, referenceHandler);
