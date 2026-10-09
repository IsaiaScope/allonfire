import { authRoutes } from "@allonfire/auth/features/hono/routes";
import { sessionLoader } from "@allonfire/auth/features/hono/session/middleware/session-loader";
import type { AuthLike } from "@allonfire/auth/shared/types/auth";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { imageRoutes } from "@allonfire/storage/features/image/hono/routes";
import type { ImageDeps } from "@allonfire/storage/features/image/hono/utils/deps";
import { isImageUpload } from "@allonfire/storage/features/image/hono/utils/upload";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { except } from "hono/combine";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { timeout } from "hono/timeout";
import type { Logger } from "pino";
import { authRateLimit } from "./features/auth/middleware/auth-rate-limit";
import { docsRoutes } from "./features/docs/routes";
import {
  normalizeThrown,
  notFound,
  onError,
} from "./features/errors/middleware/error-handler";
import { healthRoutes } from "./features/health/routes";
import type { HealthDeps } from "./features/health/utils/status";
import { localeResolver } from "./features/i18n/middleware/locale-resolver";
import { requestLogger } from "./features/logger/middleware/request-logger";
import {
  failOpen,
  type RateLimitStore,
  rateLimit,
} from "./features/rate-limit/middleware/rate-limiter";
import { requestSpans } from "./features/telemetry/middleware/request-spans";
import {
  BODY_LIMIT_BYTES,
  REQUEST_TIMEOUT_MS,
} from "./shared/constants/limits";
import { IMAGE_BASE_PATH, ROOT_PATH } from "./shared/constants/routes";
import { corsPolicy } from "./shared/middleware/cors";
import { securityHeaders } from "./shared/middleware/security-headers";
import type { AppBindings } from "./shared/types/bindings";

export type AppDeps = HealthDeps & {
  /** Every limiter's counters; each limiter brings its own window and key prefix. */
  store: RateLimitStore;
  auth: AuthLike;
  /** Image storage and rows; tests stub them. */
  images: ImageDeps;
  /** Optional so tests can capture log output. Defaults to the shared logger. */
  logger?: Logger;
};

/** Middleware order is the contract; each piece lives in its feature. */
export const createApp = (deps: AppDeps) => {
  // Wrapped once, so one Redis outage is one latch and one log line, however
  // many limiters share the store.
  const store = failOpen(deps.store, deps.logger);
  const defaultBodyLimit = bodyLimit({ maxSize: BODY_LIMIT_BYTES });
  const defaultTimeout = timeout(
    REQUEST_TIMEOUT_MS,
    () => new HTTPException(HTTP_STATUS.SERVICE_UNAVAILABLE)
  );
  // The Image module brings its own, larger body limit and time budget:
  // 100 MiB and up to 20 sharp passes outlast both defaults.
  const isUpload = (c: Context) =>
    isImageUpload(c.req.method, c.req.path, IMAGE_BASE_PATH);
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
    .use(except(isUpload, defaultBodyLimit))
    // The handler ran out of time: a temporary server-side condition, so 503
    // (RFC 9110). Not Hono's default 504, which is for gateways and carries an
    // English message `onError` would send verbatim; not 408, which blames the
    // client for sending slowly. A bare 503 maps to `TIMEOUT` and the translated
    // catalogue message.
    .use(except(isUpload, defaultTimeout))
    .use(rateLimit(store))
    .use(authRateLimit(deps.auth, store))
    // Before the Session read: probes never need one, and Better Auth reads
    // its own, so loading it here as well would read it twice.
    .route(ROOT_PATH, healthRoutes(deps))
    .route(ROOT_PATH, authRoutes(deps.auth))
    // After the limiters, so a flood of requests never reaches the Session read.
    .use(sessionLoader(deps.auth))
    .route(IMAGE_BASE_PATH, imageRoutes(deps.images));

  return app
    .route(ROOT_PATH, docsRoutes(app, deps.auth))
    .onError(onError)
    .notFound(notFound);
};
