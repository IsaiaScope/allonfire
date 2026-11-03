import { TELEMETRY } from "@allonfire/core/features/telemetry/constants/telemetry";
import type { Logger } from "pino";
import { logger as defaultLogger } from "./features/logger/logger";
import { API, type ShutdownStep } from "./shared/constants/api";

export type ShutdownDeps = {
  closeServer: () => Promise<void>;
  closeRedis: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  flushTelemetry: () => Promise<void>;
  drainTimeoutMs?: number;
  /** Optional so tests can capture the lines. */
  logger?: Logger;
};

/** How a step bounded by a timeout ended: done, out of time, or failed with its error. */
type Bounded =
  | { done: true }
  | { done: false; timedOut: true }
  | {
      done: false;
      timedOut: false;
      err: unknown;
    };

function withTimeout(promise: Promise<void>, ms: number): Promise<Bounded> {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => resolve({ done: false, timedOut: true }),
      ms
    );
    promise
      .then(() => {
        clearTimeout(timer);
        resolve({ done: true });
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        resolve({ done: false, err, timedOut: false });
      });
  });
}

/**
 * A down collector must not hold the process open: past the budget the flush
 * is abandoned. Shared by the graceful and the crash path so both give up at
 * the same point.
 */
const flushWithinBudget = (flush: () => Promise<void>): Promise<Bounded> =>
  withTimeout(flush(), TELEMETRY.LIMIT.FLUSH_TIMEOUT_MS);

export function createShutdown(deps: ShutdownDeps) {
  const drainTimeoutMs = deps.drainTimeoutMs ?? API.DEFAULT.DRAIN_TIMEOUT_MS;
  const logger = deps.logger ?? defaultLogger;

  return async function shutdown(): Promise<ShutdownStep[]> {
    const completed: ShutdownStep[] = [];

    // Stop accepting and let in-flight requests finish before any dependency
    // is closed — closing Prisma first would fail requests that could complete.
    const drain = await withTimeout(deps.closeServer(), drainTimeoutMs);
    if (drain.done) {
      completed.push(API.SHUTDOWN.STEP.SERVER);
    } else if (drain.timedOut) {
      logger.warn({ drainTimeoutMs }, API.LOG_MESSAGE.DRAIN_TIMEOUT);
    } else {
      logger.error(
        { err: drain.err, step: API.SHUTDOWN.STEP.SERVER },
        API.LOG_MESSAGE.SHUTDOWN_STEP_FAILED
      );
    }

    // An abandoned flush is reported like any other failed step, its own
    // error (if it failed rather than timed out) kept as the cause.
    const flushTelemetry = async () => {
      const flush = await flushWithinBudget(deps.flushTelemetry);
      if (!flush.done) {
        throw new Error(API.LOG_MESSAGE.TELEMETRY_FLUSH_ABANDONED, {
          cause: flush.timedOut ? undefined : flush.err,
        });
      }
    };

    // Telemetry flushes last so the spans of the closes above are exported too.
    const steps: readonly [ShutdownStep, () => Promise<void>][] = [
      [API.SHUTDOWN.STEP.REDIS, deps.closeRedis],
      [API.SHUTDOWN.STEP.DATABASE, deps.closeDatabase],
      [API.SHUTDOWN.STEP.TELEMETRY, flushTelemetry],
    ];

    // Strictly one after another, never in parallel: the order is the point.
    await steps.reduce(async (previous, [name, close]) => {
      await previous;
      try {
        await close();
        completed.push(name);
      } catch (err) {
        logger.error({ err, step: name }, API.LOG_MESSAGE.SHUTDOWN_STEP_FAILED);
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
  const log = deps.logger ?? defaultLogger;
  return async function crash(
    err: unknown,
    origin: NodeJS.UncaughtExceptionOrigin
  ): Promise<void> {
    log.fatal({ err, origin }, API.LOG_MESSAGE.CRASHED);
    await flushWithinBudget(deps.flushTelemetry);
    deps.exit(API.EXIT_CODE.CRASH);
  };
}
