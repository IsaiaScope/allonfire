import { securityHeaders } from "@allonfire/utils/security-headers";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ApplyGlobalResponse } from "hono/client";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { openAPIRouteHandler } from "hono-openapi";
import { type PinoLogger, pinoLogger } from "hono-pino";
import type { Logger } from "pino";
import pkg from "../package.json" with { type: "json" };
import { OPENAPI_DOC } from "./features/docs/constants/openapi";
import { DOCS_ROUTE } from "./features/docs/constants/routes";
import { isDocsEnabled } from "./features/docs/docs";
import { env } from "./features/environment/environment";
import type { ProblemDetails } from "./features/errors/middleware/error-handler";
import { notFound, onError } from "./features/errors/middleware/error-handler";
import { PROBE_PATHS } from "./features/health/constants/routes";
import { createHealthRoutes, type HealthDeps } from "./features/health/route";
import type { Locale } from "./features/i18n/constants/locales";
import { localeResolver } from "./features/i18n/middleware/locale-resolver";
import { logger as defaultLogger } from "./features/logger/logger";
import {
  createRateLimiter,
  type RateLimitStore,
} from "./features/rate-limit/middleware/rate-limiter";
import { type ERROR_STATUS, HTTP_STATUS } from "./shared/constants/http";
import {
  BODY_LIMIT_BYTES,
  REQUEST_TIMEOUT_MS,
} from "./shared/constants/limits";
import { ROOT_PATH } from "./shared/constants/routes";
import { CONTEXT_VAR, LOG_LEVEL } from "./shared/constants/runtime";

export type AppBindings = {
  Variables: {
    [CONTEXT_VAR.REQUEST_ID]: string;
    /** `hono-pino` puts its own wrapper here, not the bare pino logger. */
    [CONTEXT_VAR.LOGGER]: PinoLogger;
    /** Set by `localeResolver`; every error message is rendered in it. */
    [CONTEXT_VAR.LOCALE]: Locale;
  };
};

export type AppDeps = HealthDeps & {
  store: RateLimitStore;
  /** Optional so tests can capture log output. Defaults to the shared logger. */
  logger?: Logger;
};

const isProbe = (path: string) => PROBE_PATHS.has(path);

export const createApp = (deps: AppDeps) => {
  const limiter = createRateLimiter({
    store: deps.store,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    trustedHops: env.TRUSTED_PROXY_HOPS,
  });

  const docsEnabled = isDocsEnabled(env.NODE_ENV, env.ENABLE_DOCS);

  const base = new Hono<AppBindings>()
    .use(requestId())
    // Before anything that can fail, so `onError` always has a locale.
    .use(localeResolver())
    .use(
      pinoLogger({
        pino: deps.logger ?? defaultLogger,
        http: {
          // Probes are self-generated on a fixed schedule; logging them at
          // info level buries real traffic. debug keeps them available when
          // you are actually debugging a probe.
          onResLevel: (context) => {
            if (isProbe(context.req.path)) {
              return LOG_LEVEL.DEBUG;
            }
            if (context.res.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
              return LOG_LEVEL.ERROR;
            }
            return context.res.status >= HTTP_STATUS.BAD_REQUEST
              ? LOG_LEVEL.WARN
              : LOG_LEVEL.INFO;
          },
        },
      })
    )
    .use(async (context, next) => {
      for (const header of securityHeaders) {
        context.header(header.key, header.value);
      }
      await next();
    })
    .use(secureHeaders())
    .use(
      cors({
        origin: env.CORS_ORIGINS,
        // Inert until something sends a cookie, but incompatible with a
        // wildcard origin — setting it now removes a landmine from the
        // auth migration.
        credentials: true,
      })
    )
    .use(bodyLimit({ maxSize: BODY_LIMIT_BYTES }))
    .use(timeout(REQUEST_TIMEOUT_MS))
    .use(async (context, next) =>
      isProbe(context.req.path) ? next() : limiter(context, next)
    )
    .route(ROOT_PATH, createHealthRoutes(deps));

  const spec = openAPIRouteHandler(base, {
    documentation: {
      info: {
        title: OPENAPI_DOC.TITLE,
        version: pkg.version,
        description: OPENAPI_DOC.DESCRIPTION,
      },
    },
  });

  const reference = Scalar<AppBindings>({ url: DOCS_ROUTE.OPENAPI });

  // Both are middleware, not handlers: they write to `context.res` and resolve to
  // void. The arrows must be `async` so the union with `notFound` stays a
  // Promise, which is what `MiddlewareHandler` requires.
  return base
    .get(DOCS_ROUTE.OPENAPI, async (context, next) =>
      docsEnabled ? await spec(context, next) : notFound(context)
    )
    .get(DOCS_ROUTE.REFERENCE, async (context, next) =>
      docsEnabled ? await reference(context, next) : notFound(context)
    )
    .onError(onError)
    .notFound(notFound);
};

export type AppType = ReturnType<typeof createApp>;

export type {
  ErrorCode,
  ProblemDetails,
} from "./features/errors/middleware/error-handler";

/**
 * The client-facing app type. `AppType` alone describes only the success
 * responses; `onError` and `notFound` are invisible to it. Merging the error
 * envelope here means a consumer type-checks both halves of every call.
 */
export type ApiType = ApplyGlobalResponse<
  AppType,
  { [S in (typeof ERROR_STATUS)[number]]: { json: ProblemDetails } }
>;
