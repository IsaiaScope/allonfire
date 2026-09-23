import { Scalar } from "@scalar/hono-api-reference";
import type { Hono, MiddlewareHandler } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import pkg from "../../../package.json" with { type: "json" };
import { env } from "../../features/environment/environment";
import { notFound } from "../../features/errors/middleware/error-handler";
import type { AppBindings } from "../../shared/types/bindings";
import { OPENAPI_DOC } from "./constants/openapi";
import { DOCS_ROUTE } from "./constants/routes";
import { isDocsEnabled } from "./utils/enabled";

/**
 * Both are middleware, not handlers: they write to `context.res` and resolve
 * to void. The arrow must be `async` so the union with `notFound` stays a
 * Promise, which is what `MiddlewareHandler` requires.
 */
const whenEnabled = (
  handler: MiddlewareHandler<AppBindings>
): MiddlewareHandler<AppBindings> => {
  // `env` is fixed at import, so the gate is decided once, not per request.
  const enabled = isDocsEnabled(env.NODE_ENV, env.ENABLE_DOCS);
  return async (context, next) =>
    enabled ? await handler(context, next) : notFound(context);
};

/** The spec is generated from every route registered on `app` so far. */
export const specHandler = (app: Hono<AppBindings>) =>
  whenEnabled(
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          description: OPENAPI_DOC.DESCRIPTION,
          title: OPENAPI_DOC.TITLE,
          version: pkg.version,
        },
      },
    })
  );

export const referenceHandler = whenEnabled(
  Scalar<AppBindings>({ url: DOCS_ROUTE.OPENAPI })
);
