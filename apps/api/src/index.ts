import { prisma } from "@allonfire/database";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { auth } from "./features/auth/auth";
import { env } from "./features/environment/environment";
import { logger } from "./features/logger/logger";
import { createRedisStore } from "./features/rate-limit/middleware/rate-limiter";
import { createRedis } from "./features/redis/redis";
import {
  shutdownTelemetry,
  startTelemetry,
} from "./features/telemetry/telemetry";
import {
  CLEAN_EXIT_CODE,
  FORCED_EXIT_CODE,
  LOG_MESSAGE,
  REDIS_PING_REPLY,
  SHUTDOWN_SIGNAL,
} from "./shared/constants/runtime";
import { createCrashHandler, createShutdown } from "./shutdown";

// Before createApp: @hono/otel binds its meter when the app is built, and the
// global MeterProvider, unlike the tracer, has no proxy that attaches later.
startTelemetry();

const redis = createRedis(env.REDIS_URL);

const app = createApp({
  auth,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },
  checkRedis: async () => (await redis.ping()) === REDIS_PING_REPLY,
  store: createRedisStore(redis),
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  logger.info({ env: env.NODE_ENV, port: info.port }, LOG_MESSAGE.LISTENING)
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

for (const signal of SHUTDOWN_SIGNAL) {
  process.on(signal, async () => {
    if (shuttingDown) {
      logger.warn({ signal }, LOG_MESSAGE.SECOND_SIGNAL);
      process.exit(FORCED_EXIT_CODE);
    }
    shuttingDown = true;
    logger.info({ signal }, LOG_MESSAGE.SHUTTING_DOWN);
    const completed = await shutdown();
    logger.info({ completed }, LOG_MESSAGE.SHUTDOWN_COMPLETE);
    process.exit(CLEAN_EXIT_CODE);
  });
}
