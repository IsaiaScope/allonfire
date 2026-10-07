import { authOpenApi } from "@allonfire/auth/features/openapi/openapi";
import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import { problemResponseName } from "@allonfire/core/features/errors/constants/openapi";
import { CONTENT_TYPE } from "@allonfire/core/features/http/constants/http";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { Scalar } from "@scalar/hono-api-reference";
import type { Hono, MiddlewareHandler } from "hono";
import { generateSpecs, resolver } from "hono-openapi";
import pkg from "../../../../package.json" with { type: "json" };
import { env } from "../../../environment/environment";
import { ERROR_STATUS } from "../../../shared/constants/http";
import type { AppBindings } from "../../../shared/types/bindings";
import { problemDetailsSchemaFor } from "../../errors/constants/problem-details";
import { notFound } from "../../errors/middleware/error-handler";
import { OPENAPI_DOC } from "../constants/openapi";
import { DOCS_ROUTE } from "../constants/routes";
import { isDocsEnabled } from "../utils/enabled";
import { mergeOpenApi } from "../utils/merge";

/**
 * Both are middleware, not handlers: they write to `context.res` and resolve
 * to void. The arrow must be `async` so the union with `notFound` stays a
 * Promise, which is what `MiddlewareHandler` requires.
 */
const whenEnabled = (
  handler: MiddlewareHandler<AppBindings>
): MiddlewareHandler<AppBindings> => {
  // `env` is fixed at import, so the gate is decided once, not per request.
  const enabled = isDocsEnabled(env.NODE_ENV, env.API_ENABLE_DOCS);
  return async (context, next) =>
    enabled ? await handler(context, next) : notFound(context);
};

const DOCUMENTATION = {
  components: {
    // One error response per status; a route points at one with
    // `problemResponseRef(status)`.
    responses: objectFromEntries(
      ERROR_STATUS.map(
        (status) =>
          [
            problemResponseName(status),
            {
              content: {
                [CONTENT_TYPE.PROBLEM_JSON]: {
                  schema: resolver(problemDetailsSchemaFor(status)),
                },
              },
              description: OPENAPI_DOC.PROBLEM_DESCRIPTION,
            },
          ] as const
      )
    ),
  },
  info: {
    description: OPENAPI_DOC.DESCRIPTION,
    title: OPENAPI_DOC.TITLE,
    version: pkg.version,
  },
};

/**
 * The spec is generated from every route registered on `app` so far, plus the
 * Auth module's endpoints, which Better Auth describes itself. Built on the
 * first request and kept: `docsRoutes` mounts last, so no route can join later.
 */
export const specHandler = (app: Hono<AppBindings>, auth: AuthLike) => {
  let spec: Promise<ReturnType<typeof mergeOpenApi>> | undefined;
  return whenEnabled(async (context) => {
    spec ??= Promise.all([
      generateSpecs(app, { documentation: DOCUMENTATION }),
      authOpenApi(auth),
    ])
      .then(([routes, authSpec]) => mergeOpenApi(routes, authSpec))
      .catch((err: unknown) => {
        // A failed build is not kept: the next request tries again.
        spec = undefined;
        throw err;
      });
    return context.json(await spec);
  });
};

export const referenceHandler = whenEnabled(
  Scalar<AppBindings>({ url: DOCS_ROUTE.OPENAPI })
);
