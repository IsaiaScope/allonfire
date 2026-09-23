import type { Logger } from "pino";
import { logger } from "./features/logger/logger";
import {
  DEFAULT_DRAIN_TIMEOUT_MS,
  TELEMETRY_FLUSH_TIMEOUT_MS,
} from "./shared/constants/limits";
import {
  CRASH_EXIT_CODE,
  LOG_MESSAGE,
  SHUTDOWN_STEP,
  type ShutdownStep,
} from "./shared/constants/runtime";

export type ShutdownDeps = {
  closeServer: () => Promise<void>;
  closeRedis: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  flushTelemetry: () => Promise<void>;
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

/**
 * A down collector must not hold the process open: past the budget the flush
 * is abandoned. Shared by the graceful and the crash path so both give up at
 * the same point.
 */
const flushWithinBudget = (flush: () => Promise<void>): Promise<boolean> =>
  withTimeout(flush(), TELEMETRY_FLUSH_TIMEOUT_MS);

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

    // An abandoned flush is reported like any other failed step.
    const flushTelemetry = async () => {
      if (!(await flushWithinBudget(deps.flushTelemetry))) {
        throw new Error(LOG_MESSAGE.TELEMETRY_FLUSH_ABANDONED);
      }
    };

    // Telemetry flushes last so the spans of the closes above are exported too.
    const steps: readonly [ShutdownStep, () => Promise<void>][] = [
      [SHUTDOWN_STEP.REDIS, deps.closeRedis],
      [SHUTDOWN_STEP.DATABASE, deps.closeDatabase],
      [SHUTDOWN_STEP.TELEMETRY, flushTelemetry],
    ];

    // Strictly one after another, never in parallel: the order is the point.
    await steps.reduce(async (previous, [name, close]) => {
      await previous;
      try {
        await close();
        completed.push(name);
      } catch (err) {
        logger.error({ err, step: name }, LOG_MESSAGE.SHUTDOWN_STEP_FAILED);
      }
    }, Promise.resolve());

    return completed;
  };
}

export type CrashDeps = {
  flushTelemetry: () => Promise<void>;
  exit: (code: number) => void;
  /** Optional so tests can capture the fatal line. */
  logger?: Logger;
};

/**
 * For `uncaughtException` and `unhandledRejection`. Node would exit anyway, but
 * its stack goes to raw stderr, so the one error that killed the process never
 * reaches OpenObserve. This logs it through pino, gives telemetry its flush
 * budget, and exits non-zero so the orchestrator restarts the container. No
 * graceful drain: after an uncaught error the process state is unknown.
 *
 * Register it on `uncaughtException` only. An unhandled rejection arrives there
 * too (Node's default mode throws it), and `origin` says which of the two it was.
 */
export function createCrashHandler(deps: CrashDeps) {
  const log = deps.logger ?? logger;
  return async function crash(
    err: unknown,
    origin: NodeJS.UncaughtExceptionOrigin
  ): Promise<void> {
    log.fatal({ err, origin }, LOG_MESSAGE.CRASHED);
    await flushWithinBudget(deps.flushTelemetry);
    deps.exit(CRASH_EXIT_CODE);
  };
}
