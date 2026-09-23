import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { healthRoutes } from "..";
import type { HealthDeps } from "../utils/status";

/** Typed from the routes themselves: bodies need no hand-written shape and no cast. */
const client = (overrides: Partial<HealthDeps> = {}) =>
  testClient(
    healthRoutes({
      checkDatabase: async () => true,
      checkRedis: async () => true,
      ...overrides,
    })
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

  it("stays 200 when only Redis is down", async () => {
    const res = await client({ checkRedis: async () => false }).ready.$get();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.redis).toBe("unreachable");
  });
});
