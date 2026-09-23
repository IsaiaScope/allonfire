import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { timeout } from "hono/timeout";
import type { Logger } from "pino";
import {
  normalizeThrown,
  notFound,
  onError,
} from "./features/errors/middleware/error-handler";
import { localeResolver } from "./features/i18n/middleware/locale-resolver";
import { requestLogger } from "./features/logger/middleware/request-logger";
import {
  type RateLimitStore,
  rateLimit,
} from "./features/rate-limit/middleware/rate-limiter";
import { requestSpans } from "./features/telemetry/middleware/request-spans";
import { docsRoutes } from "./routes/docs";
import { healthRoutes } from "./routes/health";
import type { HealthDeps } from "./routes/health/utils/status";
import { HTTP_STATUS } from "./shared/constants/http";
import {
  BODY_LIMIT_BYTES,
  REQUEST_TIMEOUT_MS,
} from "./shared/constants/limits";
import { ROOT_PATH } from "./shared/constants/routes";
import { corsPolicy } from "./shared/middleware/cors";
import { securityHeaders } from "./shared/middleware/security-headers";
import type { AppBindings } from "./shared/types/bindings";

export type AppDeps = HealthDeps & {
  store: RateLimitStore;
  /** Optional so tests can capture log output. Defaults to the shared logger. */
  logger?: Logger;
};

/** Middleware order is the contract; each piece lives in its feature. */
export const createApp = (deps: AppDeps) => {
  const app = new Hono<AppBindings>()
    // Outermost, so every layer inside it can throw anything and still reach
    // `onError`.
    .use(normalizeThrown())
    .use(requestId())
    .use(requestSpans())
    // Before anything that can fail, so `onError` always has a locale.
    .use(localeResolver())
    .use(requestLogger(deps.logger))
    .use(securityHeaders())
    .use(corsPolicy())
    .use(bodyLimit({ maxSize: BODY_LIMIT_BYTES }))
    // The handler ran out of time: a temporary server-side condition, so 503
    // (RFC 9110). Not Hono's default 504, which is for gateways and carries an
    // English message `onError` would send verbatim; not 408, which blames the
    // client for sending slowly. A bare 503 maps to `TIMEOUT` and the translated
    // catalogue message.
    .use(
      timeout(
        REQUEST_TIMEOUT_MS,
        () => new HTTPException(HTTP_STATUS.SERVICE_UNAVAILABLE)
      )
    )
    .use(rateLimit(deps.store))
    .route(ROOT_PATH, healthRoutes(deps));

  return app
    .route(ROOT_PATH, docsRoutes(app))
    .onError(onError)
    .notFound(notFound);
};
