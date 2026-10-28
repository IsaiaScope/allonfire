import { prisma } from "@allonfire/database";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./environment/environment";
import { auth } from "./features/auth/auth";
import { imageDeps } from "./features/image/image-deps";
import { logger } from "./features/logger/logger";
import { createRedisStore } from "./features/rate-limit/middleware/rate-limiter";
import { REDIS } from "./features/redis/constants/redis";
import { createRedis } from "./features/redis/redis";
import {
  shutdownTelemetry,
  startTelemetry,
} from "./features/telemetry/telemetry";
import { userDeps } from "./features/users/user-deps";
import { API } from "./shared/constants/api";
import { createCrashHandler, createShutdown } from "./shutdown";

// Before createApp: @hono/otel binds its meter when the app is built, and the
// global MeterProvider, unlike the tracer, has no proxy that attaches later.
startTelemetry();

const redis = createRedis(env.API_REDIS_URL);

const app = createApp({
  auth,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },
  checkRedis: async () => (await redis.ping()) === REDIS.PING_REPLY,
  images: imageDeps(logger),
  store: createRedisStore(redis),
  users: userDeps(logger),
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  logger.info({ env: env.NODE_ENV, port: info.port }, API.LOG_MESSAGE.LISTENING)
);

const shutdown = createShutdown({
  closeDatabase: () => prisma.$disconnect(),
  closeRedis: async () => {
    await redis.quit();
  },
  closeServer: () =>
    new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    ),
  flushTelemetry: shutdownTelemetry,
});

const crash = createCrashHandler({
  exit: (code) => process.exit(code),
  flushTelemetry: shutdownTelemetry,
});
process.on("uncaughtException", crash);

let shuttingDown = false;

for (const signal of API.SHUTDOWN.SIGNAL) {
  process.on(signal, async () => {
    if (shuttingDown) {
      logger.warn({ signal }, API.LOG_MESSAGE.SECOND_SIGNAL);
      process.exit(API.EXIT_CODE.FORCED);
    }
    shuttingDown = true;
    logger.info({ signal }, API.LOG_MESSAGE.SHUTTING_DOWN);
    const completed = await shutdown();
    logger.info({ completed }, API.LOG_MESSAGE.SHUTDOWN_COMPLETE);
    process.exit(API.EXIT_CODE.CLEAN);
  });
}
