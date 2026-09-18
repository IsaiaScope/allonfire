import { describe, expect, it } from "vitest";
import { type AppDeps, createApp } from "./app";
import type { ProblemDetails } from "./features/errors/middleware/error-handler";
import {
  CATALOGUE,
  DEFAULT_LOCALE,
  LOCALE,
} from "./features/i18n/constants/locales";
import { createLogger } from "./features/logger/logger";

type HealthBody = { status: string; version: string; uptime: number };
type ReadyBody = {
  status: string;
  checks: { database: string; redis: string };
};

function deps(overrides: Partial<AppDeps> = {}): AppDeps {
  const hits = new Map<string, number>();
  return {
    store: {
      increment: (key: string) => {
        const totalHits = (hits.get(key) ?? 0) + 1;
        hits.set(key, totalHits);
        return Promise.resolve({
          totalHits,
          resetTime: new Date(Date.now() + 60_000),
        });
      },
      decrement: () => Promise.resolve(),
      resetKey: () => Promise.resolve(),
    },
    checkDatabase: async () => true,
    checkRedis: async () => true,
    ...overrides,
  };
}

describe("GET /health", () => {
  it("returns status, version and uptime without touching dependencies", async () => {
    const app = createApp(
      deps({
        checkDatabase: () => {
          throw new Error("must not be called");
        },
      })
    );

    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });
});

describe("GET /ready", () => {
  it("returns 200 when both dependencies are healthy", async () => {
    const res = await createApp(deps()).request("/ready");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("returns 503 when Postgres is down", async () => {
    const app = createApp(deps({ checkDatabase: async () => false }));
    const res = await app.request("/ready");

    expect(res.status).toBe(503);
    const body = (await res.json()) as ReadyBody;
    expect(body.checks.database).toBe("unreachable");
  });

  it("stays 200 when only Redis is down", async () => {
    const app = createApp(deps({ checkRedis: async () => false }));
    const res = await app.request("/ready");

    expect(res.status).toBe(200);
    const body = (await res.json()) as ReadyBody;
    expect(body.status).toBe("degraded");
    expect(body.checks.redis).toBe("unreachable");
  });
});

describe("probe exemption", () => {
  it("never rate-limits /health or /ready", async () => {
    const store = deps().store;
    let increments = 0;
    const counting: AppDeps["store"] = {
      ...store,
      increment: (key) => {
        increments += 1;
        return store.increment(key);
      },
    };

    const app = createApp(deps({ store: counting }));
    await app.request("/health");
    await app.request("/ready");

    expect(increments).toBe(0);
  });
});

describe("unmatched routes", () => {
  it("returns the NOT_FOUND envelope", async () => {
    const res = await createApp(deps()).request("/nothing-here");
    expect(res.status).toBe(404);
    expect(((await res.json()) as ProblemDetails).code).toBe("NOT_FOUND");
  });
});

describe("RFC 9457 problem documents", () => {
  it("serves the problem media type, not application/json", async () => {
    const res = await createApp(deps()).request("/nothing-here");
    expect(res.headers.get("content-type")).toContain(
      "application/problem+json"
    );
  });

  it("carries every member the RFC requires, plus our extensions", async () => {
    const res = await createApp(deps()).request("/nothing-here");
    const body = (await res.json()) as ProblemDetails;

    expect(body).toMatchObject({
      type: "/errors/not-found",
      title: "Not Found",
      status: 404,
      instance: "/nothing-here",
      code: "NOT_FOUND",
    });
    expect(body.detail).toBeTruthy();
    expect(body.requestId).toBeTruthy();
  });

  it("keeps `title` invariant across locales while `detail` localises", async () => {
    const app = createApp(deps());
    const en = (await (
      await app.request("/nothing-here")
    ).json()) as ProblemDetails;
    const it = (await (
      await app.request("/nothing-here", {
        headers: { "Accept-Language": "it" },
      })
    ).json()) as ProblemDetails;

    // RFC 9457 §3.1.2: title should not change from occurrence to occurrence.
    expect(en.title).toBe(it.title);
    expect(en.type).toBe(it.type);
    expect(en.detail).not.toBe(it.detail);
  });

  it("reports the path the problem occurred on", async () => {
    const res = await createApp(deps()).request("/v1/definitely-missing");
    const body = (await res.json()) as ProblemDetails;
    expect(body.instance).toBe("/v1/definitely-missing");
  });
});

describe("probe logging", () => {
  it("does not emit an info line for /health", async () => {
    const lines: string[] = [];
    const stream = {
      write: (chunk: string) => {
        lines.push(chunk);
      },
    };

    const app = createApp({
      ...deps(),
      logger: createLogger({ destination: stream }),
    });

    await app.request("/health");

    const infoLines = lines
      .map((line) => JSON.parse(line) as { level: number })
      .filter((entry) => entry.level >= 30);

    expect(infoLines).toHaveLength(0);
  });

  it("emits an info line for a normal request", async () => {
    const lines: string[] = [];
    const stream = {
      write: (chunk: string) => {
        lines.push(chunk);
      },
    };

    const app = createApp({
      ...deps(),
      logger: createLogger({ destination: stream }),
    });

    await app.request("/nothing-here");

    expect(lines.length).toBeGreaterThan(0);
  });
});

describe("documentation routes", () => {
  it("serves a spec describing the probes", async () => {
    const res = await createApp(deps()).request("/openapi.json");
    expect(res.status).toBe(200);

    const spec = (await res.json()) as {
      paths: Record<string, { get: { summary: string } }>;
    };
    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/health"]?.get.summary).toBe("Liveness probe");
  });

  it("serves the Scalar reference in development", async () => {
    const res = await createApp(deps()).request("/reference");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("rate-limits the docs routes, unlike the probes", async () => {
    let increments = 0;
    const base = deps();
    const counting: AppDeps["store"] = {
      ...base.store,
      increment: (key) => {
        increments += 1;
        return base.store.increment(key);
      },
    };

    await createApp({ ...base, store: counting }).request("/openapi.json");
    expect(increments).toBe(1);
  });
});

describe("error message localization", () => {
  const notFoundIn = async (headers?: Record<string, string>) => {
    const app = createApp(deps());
    const res = await app.request("/nothing-here", { headers });
    return (await res.json()) as ProblemDetails;
  };

  it("falls back to English when no language is passed", async () => {
    const body = await notFoundIn();
    expect(body.detail).toBe(CATALOGUE[DEFAULT_LOCALE].NOT_FOUND);
  });

  it("renders the message in the language the frontend passes", async () => {
    const body = await notFoundIn({ "Accept-Language": "it" });
    expect(body.detail).toBe(CATALOGUE[LOCALE.IT_IT].NOT_FOUND);
  });

  it("falls back to English for an unsupported language", async () => {
    const body = await notFoundIn({ "Accept-Language": "ja-JP" });
    expect(body.detail).toBe(CATALOGUE[DEFAULT_LOCALE].NOT_FOUND);
  });

  it("honours an exact regional variant", async () => {
    const body = await notFoundIn({ "Accept-Language": "it-CH" });
    expect(body.detail).toBe(CATALOGUE[LOCALE.IT_CH].NOT_FOUND);
  });

  it("keeps the code stable across locales", async () => {
    const en = await notFoundIn();
    const it = await notFoundIn({ "Accept-Language": "it" });
    expect(en.code).toBe(it.code);
    expect(en.detail).not.toBe(it.detail);
  });
});
