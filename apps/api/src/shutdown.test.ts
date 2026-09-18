import { describe, expect, it, vi } from "vitest";
import { createShutdown } from "./shutdown";

describe("createShutdown", () => {
  it("closes the server before Redis and the database", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: () => {
        order.push("server");
        return Promise.resolve();
      },
      closeRedis: () => {
        order.push("redis");
        return Promise.resolve();
      },
      closeDatabase: () => {
        order.push("database");
        return Promise.resolve();
      },
    });

    await shutdown();
    expect(order).toEqual(["server", "redis", "database"]);
  });

  it("gives up on a hung drain after the timeout", async () => {
    vi.useFakeTimers();
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: () => new Promise<void>(() => undefined),
      closeRedis: () => {
        order.push("redis");
        return Promise.resolve();
      },
      closeDatabase: () => {
        order.push("database");
        return Promise.resolve();
      },
      drainTimeoutMs: 10_000,
    });

    const done = shutdown();
    await vi.advanceTimersByTimeAsync(10_000);
    await done;

    expect(order).toEqual(["redis", "database"]);
    vi.useRealTimers();
  });

  it("continues shutting down when one step throws", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: () => {
        order.push("server");
        return Promise.resolve();
      },
      closeRedis: () => Promise.reject(new Error("redis already gone")),
      closeDatabase: () => {
        order.push("database");
        return Promise.resolve();
      },
    });

    await expect(shutdown()).resolves.toBeDefined();
    expect(order).toEqual(["server", "database"]);
  });
});
