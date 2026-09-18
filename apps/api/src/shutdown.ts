import { logger } from "./features/logger/logger";
import { DEFAULT_DRAIN_TIMEOUT_MS } from "./shared/constants/limits";
import {
  LOG_MESSAGE,
  SHUTDOWN_STEP,
  type ShutdownStep,
} from "./shared/constants/runtime";

export type ShutdownDeps = {
  closeServer: () => Promise<void>;
  closeRedis: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  drainTimeoutMs?: number;
};

function withTimeout(promise: Promise<void>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    promise
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

export function createShutdown(deps: ShutdownDeps) {
  const drainTimeoutMs = deps.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;

  return async function shutdown(): Promise<ShutdownStep[]> {
    const completed: ShutdownStep[] = [];

    // Stop accepting and let in-flight requests finish before any dependency
    // is closed — closing Prisma first would fail requests that could complete.
    if (await withTimeout(deps.closeServer(), drainTimeoutMs)) {
      completed.push(SHUTDOWN_STEP.SERVER);
    } else {
      logger.warn({ drainTimeoutMs }, LOG_MESSAGE.DRAIN_TIMEOUT);
    }

    const steps: readonly [ShutdownStep, () => Promise<void>][] = [
      [SHUTDOWN_STEP.REDIS, deps.closeRedis],
      [SHUTDOWN_STEP.DATABASE, deps.closeDatabase],
    ];

    for (const [name, close] of steps) {
      try {
        await close();
        completed.push(name);
      } catch (err) {
        logger.error({ err, step: name }, LOG_MESSAGE.SHUTDOWN_STEP_FAILED);
      }
    }

    return completed;
  };
}
