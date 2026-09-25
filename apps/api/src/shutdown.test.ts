// @module-tag unit
import { captureLog } from "./features/logger/tests/capture";
import { TELEMETRY_FLUSH_TIMEOUT_MS } from "./shared/constants/limits";
import { createCrashHandler, createShutdown } from "./shutdown";

const recorder = (order: string[], name: string) => () => {
  order.push(name);
  return Promise.resolve();
};

describe("createShutdown", () => {
  it("closes the server, then Redis, the database, and flushes telemetry last", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeDatabase: recorder(order, "database"),
      closeRedis: recorder(order, "redis"),
      closeServer: recorder(order, "server"),
      flushTelemetry: recorder(order, "telemetry"),
    });

    await shutdown();
    expect(order).toEqual(["server", "redis", "database", "telemetry"]);
  });

  it("gives up on a hung drain after the timeout", async () => {
    vi.useFakeTimers();
    const order: string[] = [];

    const shutdown = createShutdown({
      closeDatabase: recorder(order, "database"),
      closeRedis: recorder(order, "redis"),
      closeServer: () => new Promise<void>(() => undefined),
      drainTimeoutMs: 10_000,
      flushTelemetry: recorder(order, "telemetry"),
    });

    const done = shutdown();
    await vi.advanceTimersByTimeAsync(10_000);
    await done;

    expect(order).toEqual(["redis", "database", "telemetry"]);
    vi.useRealTimers();
  });

  it("continues shutting down when one step throws", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeDatabase: recorder(order, "database"),
      closeRedis: () => Promise.reject(new Error("redis already gone")),
      closeServer: recorder(order, "server"),
      flushTelemetry: recorder(order, "telemetry"),
    });

    await expect(shutdown()).resolves.toBeDefined();
    expect(order).toEqual(["server", "database", "telemetry"]);
  });

  it("abandons a telemetry flush that hangs, so the process can exit", async () => {
    vi.useFakeTimers();

    const shutdown = createShutdown({
      closeDatabase: () => Promise.resolve(),
      closeRedis: () => Promise.resolve(),
      closeServer: () => Promise.resolve(),
      // An unreachable collector: the OTLP exporter retries for ~8s.
      flushTelemetry: () => new Promise<void>(() => undefined),
    });

    const done = shutdown();
    await vi.advanceTimersByTimeAsync(TELEMETRY_FLUSH_TIMEOUT_MS);

    await expect(done).resolves.toEqual(["server", "redis", "database"]);
    vi.useRealTimers();
  });

  it("reports every other step when the telemetry flush fails", async () => {
    const shutdown = createShutdown({
      closeDatabase: () => Promise.resolve(),
      closeRedis: () => Promise.resolve(),
      closeServer: () => Promise.resolve(),
      flushTelemetry: () => Promise.reject(new Error("collector unreachable")),
    });

    await expect(shutdown()).resolves.toEqual(["server", "redis", "database"]);
  });
});

describe("createCrashHandler", () => {
  it("flushes telemetry, then exits with a failure code", async () => {
    const order: string[] = [];
    const crash = createCrashHandler({
      exit: (code) => {
        order.push(`exit ${code}`);
      },
      flushTelemetry: recorder(order, "telemetry"),
    });

    await crash(new Error("boom"), "uncaughtException");
    expect(order).toEqual(["telemetry", "exit 1"]);
  });

  it("logs whether the error was thrown or a rejected promise", async () => {
    const { lines, logger } = captureLog();
    const crash = createCrashHandler({
      exit: () => undefined,
      flushTelemetry: () => Promise.resolve(),
      logger,
    });

    await crash(new Error("boom"), "unhandledRejection");
    expect(lines).toMatchObject([
      { msg: "uncaught error, exiting", origin: "unhandledRejection" },
    ]);
  });

  it("still exits when the flush hangs", async () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    const crash = createCrashHandler({
      exit,
      flushTelemetry: () => new Promise<void>(() => undefined),
    });

    const done = crash(new Error("boom"), "uncaughtException");
    await vi.advanceTimersByTimeAsync(TELEMETRY_FLUSH_TIMEOUT_MS);
    await done;
    vi.useRealTimers();

    expect(exit).toHaveBeenCalledWith(1);
  });
});
