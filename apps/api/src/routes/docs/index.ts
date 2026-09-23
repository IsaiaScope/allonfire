import { Hono } from "hono";
import type { AppBindings } from "../../shared/types/bindings";
import { DOCS_ROUTE } from "./constants/routes";
import { referenceHandler, specHandler } from "./handlers";

/** Mount after the routes the spec should describe. */
export const docsRoutes = (app: Hono<AppBindings>) =>
  new Hono<AppBindings>()
    .get(DOCS_ROUTE.OPENAPI, specHandler(app))
    .get(DOCS_ROUTE.REFERENCE, referenceHandler);
