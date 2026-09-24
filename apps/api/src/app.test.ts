import { describe, expect, it, vi } from "vitest";
import { type AppDeps, createApp } from "./app";
import {
  fallbackMessage,
  type ProblemDetails,
} from "./features/errors/middleware/error-handler";
import {
  CATALOGUE,
  DEFAULT_LOCALE,
  LOCALE,
} from "./features/i18n/constants/locales";
import { createLogger } from "./features/logger/logger";
import { REQUEST_TIMEOUT_MS } from "./shared/constants/limits";
import { API_VERSION_PREFIX } from "./shared/constants/routes";

function deps(overrides: Partial<AppDeps> = {}): AppDeps {
  const hits = new Map<string, number>();
  return {
    checkDatabase: async () => true,
    checkRedis: async () => true,
    store: {
      decrement: () => Promise.resolve(),
      increment: (key: string) => {
        const totalHits = (hits.get(key) ?? 0) + 1;
        hits.set(key, totalHits);
        return Promise.resolve({
          resetTime: new Date(Date.now() + 60_000),
          totalHits,
        });
      },
      resetKey: () => Promise.resolve(),
    },
    ...overrides,
  };
}

describe("probe exemption", () => {
  it("never rate-limits /health or /ready", async () => {
    const { store } = deps();
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
  it("answers a thrown non-Error with a problem document, not plain text", async () => {
    const app = createApp(deps())
      .get("/throws-string", () => {
        const thrown: unknown = "not an Error";
        throw thrown;
      })
      .get("/rejects-object", () => Promise.reject({ reason: "not an Error" }));

    const responses = await Promise.all(
      ["/throws-string", "/rejects-object"].map((path) => app.request(path))
    );
    for (const res of responses) {
      expect(res.status).toBe(500);
      expect(res.headers.get("content-type")).toContain(
        "application/problem+json"
      );
    }
    const bodies = await Promise.all(
      responses.map((res) => res.json() as Promise<ProblemDetails>)
    );
    expect(bodies.map((body) => body.code)).toEqual([
      "INTERNAL_ERROR",
      "INTERNAL_ERROR",
    ]);
  });

  it("answers a request past the timeout with a localised 503 TIMEOUT problem", async () => {
    vi.useFakeTimers();
    const app = createApp(deps()).get(
      "/slow",
      () => new Promise(() => undefined)
    );

    const pending = app.request("/slow", {
      headers: { "accept-language": LOCALE.IT_IT },
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    const res = await pending;
    vi.useRealTimers();

    expect(res.status).toBe(503);
    const body = (await res.json()) as ProblemDetails;
    expect(body.code).toBe("TIMEOUT");
    expect(body.detail).toBe(fallbackMessage("TIMEOUT", LOCALE.IT_IT));
  });

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
      code: "NOT_FOUND",
      instance: "/nothing-here",
      status: 404,
      title: "Not Found",
      type: "/errors/not-found",
    });
    expect(body.detail).toBeTruthy();
    expect(body.requestId).toBeTruthy();
  });

  it("keeps `title` invariant across locales while `detail` localises", async () => {
    const app = createApp(deps());
    const en = (await (
      await app.request("/nothing-here")
    ).json()) as ProblemDetails;
    const italian = (await (
      await app.request("/nothing-here", {
        headers: { "Accept-Language": "it" },
      })
    ).json()) as ProblemDetails;

    // RFC 9457 §3.1.2: title should not change from occurrence to occurrence.
    expect(en.title).toBe(italian.title);
    expect(en.type).toBe(italian.type);
    expect(en.detail).not.toBe(italian.detail);
  });

  it("reports the path the problem occurred on", async () => {
    const path = `${API_VERSION_PREFIX}/definitely-missing`;
    const res = await createApp(deps()).request(path);
    const body = (await res.json()) as ProblemDetails;
    expect(body.instance).toBe(path);
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

describe("request log headers", () => {
  it("logs only allowlisted request headers", async () => {
    const lines: string[] = [];
    const app = createApp({
      ...deps(),
      logger: createLogger({
        destination: { write: (chunk: string) => lines.push(chunk) },
      }),
    });

    await app.request("/openapi.json", {
      headers: {
        "accept-language": "it",
        traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
        "user-agent": "curl/8",
        "x-forwarded-for": "203.0.113.7",
      },
    });

    const [entry] = lines.map(
      (line) => JSON.parse(line) as { req?: { headers?: object } }
    );
    expect(entry?.req?.headers).toEqual({ "accept-language": "it" });
  });
});

describe("documentation routes", () => {
  it("serves a spec describing the probes", async () => {
    const res = await createApp(deps()).request("/openapi.json");
    expect(res.status).toBe(200);

    const spec = (await res.json()) as {
      paths: { "/health"?: { get: { summary: string } } };
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
    const res = await app.request("/nothing-here", headers ? { headers } : {});
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
    const italian = await notFoundIn({ "Accept-Language": "it" });
    expect(en.code).toBe(italian.code);
    expect(en.detail).not.toBe(italian.detail);
  });
});
