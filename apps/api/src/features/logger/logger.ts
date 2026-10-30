import { LOG } from "@allonfire/core/features/logger/constants/logger";
import { ENV } from "@allonfire/core/shared/constants/env";
import { trace } from "@opentelemetry/api";
import pino, { type DestinationStream, type Logger } from "pino";
import pkg from "../../../package.json" with { type: "json" };
import { env } from "../../environment/environment";
import { API } from "../../shared/constants/api";
import { TELEMETRY } from "../telemetry/constants/telemetry";
import {
  otlpExporterOptions,
  telemetryResourceAttributes,
} from "../telemetry/resource";

const PRETTY_TRANSPORT = {
  options: { colorize: true },
  target: "pino-pretty",
} as const;

/** Plain JSON to stdout, as `pino()` writes without a transport. */
const STDOUT_TRANSPORT = {
  options: { destination: 1 },
  target: "pino/file",
} as const;

/**
 * Ships every line to the OTLP collector. Endpoint, headers and resource come
 * from the typed `env`, the same resource the SDK sends with traces and
 * metrics. The timeout caps the exporter's retries: the worker flushes on exit,
 * and against a down collector the default 10s held every shutdown open.
 */
const otelTransport = (endpoint: string) => ({
  options: {
    loggerName: "pino",
    logRecordProcessorOptions: {
      exporterOptions: {
        protobufExporterOptions: {
          ...otlpExporterOptions(endpoint, TELEMETRY.PATH.LOGS),
          timeoutMillis: API.LIMIT.TELEMETRY_FLUSH_TIMEOUT_MS,
        },
        protocol: "http/protobuf",
      },
      recordProcessorType: "batch",
    },
    resourceAttributes: telemetryResourceAttributes(),
    serviceVersion: pkg.version,
  },
  target: "pino-opentelemetry-transport",
});

/**
 * Stamps a line logged inside a span with that span's ids, so the collector
 * links the line to its trace. The field names are the ones
 * pino-opentelemetry-transport reads.
 */
const traceContext = () => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext
    ? {
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags,
        trace_id: spanContext.traceId,
      }
    : {};
};

export function createLogger(opts?: {
  destination?: DestinationStream;
}): Logger {
  const options = {
    level: env.API_LOG_LEVEL,
    mixin: traceContext,
    redact: { censor: LOG.REDACT.CENSOR, paths: [...LOG.REDACT.PATHS] },
  };

  if (opts?.destination) {
    return pino(options, opts.destination);
  }

  const isDevelopment = env.NODE_ENV === ENV.NODE.DEVELOPMENT;

  const endpoint = env.TELEMETRY_ENDPOINT;
  if (endpoint) {
    const consoleTarget = isDevelopment ? PRETTY_TRANSPORT : STDOUT_TRANSPORT;
    // Each target filters at `info` unless told otherwise.
    const targets = [consoleTarget, otelTransport(endpoint)].map((target) => ({
      ...target,
      level: env.API_LOG_LEVEL,
    }));
    return pino({ ...options, transport: { targets } });
  }

  if (isDevelopment) {
    return pino({ ...options, transport: PRETTY_TRANSPORT });
  }

  return pino(options);
}

export const logger = createLogger();
