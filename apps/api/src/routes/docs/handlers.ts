import { authOpenApi } from "@allonfire/auth/features/openapi/openapi";
import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import { CONTENT_TYPE } from "@allonfire/utils/constants/http";
import { Scalar } from "@scalar/hono-api-reference";
import type { Hono, MiddlewareHandler } from "hono";
import { generateSpecs, resolver } from "hono-openapi";
import pkg from "../../../package.json" with { type: "json" };
import { env } from "../../environment/environment";
import { problemDetailsSchema } from "../../features/errors/constants/problem-details";
import { notFound } from "../../features/errors/middleware/error-handler";
import type { AppBindings } from "../../shared/types/bindings";
import { OPENAPI_DOC, OPENAPI_RESPONSE } from "./constants/openapi";
import { DOCS_ROUTE } from "./constants/routes";
import { isDocsEnabled } from "./utils/enabled";
import { mergeOpenApi } from "./utils/merge";

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

const DOCUMENTATION = {
  components: {
    // Every error the API sends; a route documents one with
    // `$ref: "#/components/responses/Problem"`.
    responses: {
      [OPENAPI_RESPONSE.PROBLEM]: {
        content: {
          [CONTENT_TYPE.PROBLEM_JSON]: {
            schema: resolver(problemDetailsSchema),
          },
        },
        description: OPENAPI_DOC.PROBLEM_DESCRIPTION,
      },
    },
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
