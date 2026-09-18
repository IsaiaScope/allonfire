import { prisma } from "@allonfire/database";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./features/environment/environment";
import { logger } from "./features/logger/logger";
import { createRedisStore } from "./features/rate-limit/middleware/rate-limiter";
import { createRedis } from "./features/redis/redis";
import {
  CLEAN_EXIT_CODE,
  FORCED_EXIT_CODE,
  LOG_MESSAGE,
  REDIS_PING_REPLY,
  SHUTDOWN_SIGNAL,
} from "./shared/constants/runtime";
import { createShutdown } from "./shutdown";

const redis = createRedis(env.REDIS_URL);

const app = createApp({
  store: createRedisStore(redis, env.RATE_LIMIT_WINDOW_MS),
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },
  checkRedis: async () => (await redis.ping()) === REDIS_PING_REPLY,
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  logger.info({ port: info.port, env: env.NODE_ENV }, LOG_MESSAGE.LISTENING)
);

const shutdown = createShutdown({
  closeServer: () =>
    new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    ),
  closeRedis: async () => {
    await redis.quit();
  },
  closeDatabase: () => prisma.$disconnect(),
});

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
