import { context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { type AppDeps, createApp } from "../../../app";

const exporter = new InMemorySpanExporter();

const deps: AppDeps = {
  checkDatabase: async () => true,
  checkRedis: async () => true,
  store: {
    decrement: () => Promise.resolve(),
    increment: () =>
      Promise.resolve({
        resetTime: new Date(Date.now() + 60_000),
        totalHits: 1,
      }),
    resetKey: () => Promise.resolve(),
  },
};

const spanNames = () => exporter.getFinishedSpans().map((span) => span.name);

describe("request spans", () => {
  beforeAll(() => {
    trace.setGlobalTracerProvider(
      new TracerProvider({
        spanProcessors: [new SimpleSpanProcessor({ exporter })],
      })
    );
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable()
    );
  });

  afterEach(() => exporter.reset());

  afterAll(() => {
    trace.disable();
    context.disable();
  });

  it("names each request span after its route pattern", async () => {
    const app = createApp(deps);

    await app.request("/openapi.json");

    expect(spanNames()).toEqual(["GET /openapi.json"]);
  });

  it("collapses unmatched paths to the catch-all pattern, not the raw path", async () => {
    const app = createApp(deps);

    await app.request("/wp-admin/setup.php");

    expect(spanNames()).toEqual(["GET /*"]);
  });

  it("does not trace health probes, query string or not", async () => {
    const app = createApp(deps);

    await app.request("/health");
    await app.request("/ready");
    await app.request("/health?probe=1");

    expect(spanNames()).toEqual([]);
  });
});
