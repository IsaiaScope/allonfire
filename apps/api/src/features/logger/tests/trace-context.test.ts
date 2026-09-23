import { context } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { TracerProvider } from "@opentelemetry/sdk-trace";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLogger } from "../logger";

const tracer = new TracerProvider().getTracer("trace-context-test");

function captureLines() {
  const lines: Record<string, unknown>[] = [];
  return {
    lines,
    stream: {
      write: (chunk: string) => {
        lines.push(JSON.parse(chunk));
      },
    },
  };
}

describe("log lines and traces", () => {
  beforeAll(() => {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable()
    );
  });

  afterAll(() => context.disable());

  it("stamps a line logged inside a span with that span's ids", () => {
    const { lines, stream } = captureLines();
    const logger = createLogger({ destination: stream });

    const spanContext = tracer.startActiveSpan("request", (span) => {
      logger.info("inside");
      span.end();
      return span.spanContext();
    });

    expect(lines[0]).toMatchObject({
      span_id: spanContext.spanId,
      trace_flags: spanContext.traceFlags,
      trace_id: spanContext.traceId,
    });
  });

  it("leaves a line logged outside any span unstamped", () => {
    const { lines, stream } = captureLines();
    const logger = createLogger({ destination: stream });

    logger.info("outside");

    expect(lines[0]).not.toHaveProperty("trace_id");
  });
});
