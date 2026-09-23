import { context, metrics, SpanStatusCode, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { requestSpans } from "../middleware/request-spans";

const spans = new InMemorySpanExporter();
const metricExporter = new InMemoryMetricExporter(
  AggregationTemporality.CUMULATIVE
);
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
});

const buildApp = () =>
  new Hono()
    .use(requestSpans())
    .get("/things/:id", (c) => c.text("ok"))
    .get("/invalid", () => {
      throw new HTTPException(422);
    })
    .get("/broken", () => {
      throw new Error("boom");
    })
    // Stands in for /ready's database check, which Prisma traces.
    .get("/ready", (c) => {
      trace.getTracer("prisma-stand-in").startActiveSpan("query", (span) => {
        span.end();
      });
      return c.text("ok");
    })
    .onError((err, c) =>
      c.text("error", err instanceof HTTPException ? err.status : 500)
    );

const onlySpan = () => {
  const [span] = spans.getFinishedSpans();
  if (!span) {
    throw new Error("expected one finished span");
  }
  return span;
};

describe("requestSpans", () => {
  beforeAll(() => {
    trace.setGlobalTracerProvider(
      new TracerProvider({
        spanProcessors: [new SimpleSpanProcessor({ exporter: spans })],
      })
    );
    metrics.setGlobalMeterProvider(
      new MeterProvider({ readers: [metricReader] })
    );
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable()
    );
  });

  afterEach(() => spans.reset());

  afterAll(() => {
    trace.disable();
    metrics.disable();
    context.disable();
  });

  it("keeps the query string, and any token in it, out of the span", async () => {
    await buildApp().request("/things/42?token=secret");

    const { attributes } = onlySpan();
    expect(attributes["url.full"]).toBe("http://localhost/things/42");
    expect(attributes["url.path"]).toBe("/things/42");
    expect(attributes["url.scheme"]).toBe("http");
    expect(JSON.stringify(attributes)).not.toContain("secret");
  });

  it("leaves a 4xx span unset, as the HTTP semantic conventions require", async () => {
    await buildApp().request("/invalid");

    expect(onlySpan().status.code).toBe(SpanStatusCode.UNSET);
  });

  it("marks a 5xx span as an error", async () => {
    await buildApp().request("/broken");

    expect(onlySpan().status.code).toBe(SpanStatusCode.ERROR);
  });

  it("traces nothing a probe triggers, including its database check", async () => {
    await buildApp().request("/ready");

    expect(spans.getFinishedSpans()).toHaveLength(0);
  });

  it("labels the duration metric with the service, not empty attributes", async () => {
    await buildApp().request("/things/42");
    await metricReader.forceFlush();

    const pointAttributes = metricExporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
      .filter(
        (metric) => metric.descriptor.name === "http.server.request.duration"
      )
      .flatMap((metric) => metric.dataPoints.map((point) => point.attributes));

    expect(pointAttributes.length).toBeGreaterThan(0);
    for (const attributes of pointAttributes) {
      expect(attributes["service.name"]).toBe("allonfire-api");
      expect(attributes["service.version"]).toEqual(expect.any(String));
    }
  });
});
