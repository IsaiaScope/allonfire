// @module-tag unit
import { testClient } from "hono/testing";
import type { Logger } from "pino";
import { API } from "../../../shared/constants/api";
import { captureLog } from "../../logger/tests/capture";
import { healthRoutes } from "../routes";
import type { HealthDeps } from "../utils/status";

/** Typed from the routes themselves: bodies need no hand-written shape and no cast. */
const client = (overrides: Partial<HealthDeps> = {}, logger?: Logger) =>
  testClient(
    healthRoutes(
      {
        checkDatabase: async () => true,
        checkRedis: async () => true,
        ...overrides,
      },
      logger
    )
  );

describe("GET /health", () => {
  it("returns status, version and uptime without touching dependencies", async () => {
    const res = await client({
      checkDatabase: () => {
        throw new Error("must not be called");
      },
    }).health.$get();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });
});

describe("GET /ready", () => {
  it("returns 200 when both dependencies are healthy", async () => {
    const res = await client().ready.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      checks: { database: "ok", redis: "ok" },
      status: "ok",
    });
  });

  it("returns 503 when Postgres is down", async () => {
    const res = await client({ checkDatabase: async () => false }).ready.$get();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.checks.database).toBe("unreachable");
  });

  it("returns 503 when the database check throws", async () => {
    const res = await client({
      checkDatabase: () => Promise.reject(new Error("refused")),
    }).ready.$get();

    expect(res.status).toBe(503);
  });

  it("a failed database check still answers 503 and logs the cause", async () => {
    const { lines, logger } = captureLog();

    const res = await client(
      { checkDatabase: () => Promise.reject(new Error("refused")) },
      logger
    ).ready.$get();

    expect(res.status).toBe(503);
    expect(lines).toEqual([
      expect.objectContaining({
        err: expect.objectContaining({ message: "refused" }),
        msg: API.LOG_MESSAGE.DATABASE_DOWN,
      }),
    ]);
  });

  it("logs a database outage once, and its end once", async () => {
    const { lines, logger } = captureLog();
    // Down for two probes, then back for two.
    const checkDatabase = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValueOnce(new Error("refused"))
      .mockRejectedValueOnce(new Error("refused"))
      .mockResolvedValue(true);
    const { ready } = client({ checkDatabase }, logger);

    await ready.$get();
    await ready.$get();
    await ready.$get();
    await ready.$get();

    expect(lines.map((line) => line.msg)).toEqual([
      API.LOG_MESSAGE.DATABASE_DOWN,
      API.LOG_MESSAGE.DATABASE_RECOVERED,
    ]);
  });

  it("stays 200 when only Redis is down", async () => {
    const res = await client({ checkRedis: async () => false }).ready.$get();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.redis).toBe("unreachable");
  });
});
