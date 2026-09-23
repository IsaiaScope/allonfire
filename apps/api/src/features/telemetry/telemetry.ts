/**
 * The OpenTelemetry SDK. `src/index.ts` starts it before building the app;
 * `app.ts` never imports this file, so tests never start it.
 *
 * Nothing here patches modules, so there is no loader hook, no `--import`
 * preload and no import-order rule. HTTP spans and the request-duration metric
 * come from `@hono/otel` inside the app, Prisma reports through its own engine
 * hooks, and logs reach the collector through a pino transport (see
 * `features/logger`). Redis calls are not traced: ioredis can only be traced by
 * patching it.
 *
 * Endpoint, headers and resource come from the typed `env` and are passed to
 * each exporter explicitly. The SDK still reads standard `OTEL_*` tuning
 * variables it finds in the process environment (sampler, batch sizes,
 * compression, `OTEL_SDK_DISABLED`); none are set by this project.
 *
 * Export failures (OpenObserve down, wrong credentials) reach the API log as
 * warnings through `pinoDiagLogger`, and never throw into a request.
 */
import { type DiagLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import type { Logger } from "pino";
import { env } from "../environment/environment";
import { logger as defaultLogger } from "../logger/logger";
import { OTLP_PATH, PRISMA_STARTUP_SPANS } from "./constants/telemetry";
import { otlpExporterOptions, telemetryResourceAttributes } from "./resource";

let sdk: NodeSDK | undefined;

/**
 * OpenTelemetry reports its own failures through `diag`, which discards them
 * until a logger is installed. Without this, a wrong password or a down
 * collector means empty dashboards and no clue why.
 */
export const pinoDiagLogger = (logger: Logger): DiagLogger => ({
  debug: (message, ...args) => logger.debug({ args }, message),
  error: (message, ...args) => logger.error({ args }, message),
  info: (message, ...args) => logger.info({ args }, message),
  verbose: (message, ...args) => logger.trace({ args }, message),
  warn: (message, ...args) => logger.warn({ args }, message),
});

export function startTelemetry(): void {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (sdk || !endpoint) {
    return;
  }
  diag.setLogger(pinoDiagLogger(defaultLogger), DiagLogLevel.WARN);

  // ponytail: every trace is sampled (the SDK default). Set
  // OTEL_TRACES_SAMPLER=parentbased_traceidratio if span volume ever matters.
  sdk = new NodeSDK({
    instrumentations: [
      new PrismaInstrumentation({ ignoreSpanTypes: [...PRISMA_STARTUP_SPANS] }),
    ],
    // Logs ship through the pino transport. Left undefined, the SDK would
    // build a second, env-configured log pipeline beside it.
    logRecordProcessors: [],
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(
          otlpExporterOptions(endpoint, OTLP_PATH.METRICS)
        ),
      }),
    ],
    resource: resourceFromAttributes(telemetryResourceAttributes()),
    serviceName: env.OTEL_SERVICE_NAME,
    traceExporter: new OTLPTraceExporter(
      otlpExporterOptions(endpoint, OTLP_PATH.TRACES)
    ),
  });
  sdk.start();
}

/** Exports whatever is still buffered. A no-op when the SDK never started. */
export async function shutdownTelemetry(): Promise<void> {
  await sdk?.shutdown();
}
