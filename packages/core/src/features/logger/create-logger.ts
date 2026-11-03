import { trace } from "@opentelemetry/api";
import pino, {
  type DestinationStream,
  type Logger,
  type TransportTargetOptions,
} from "pino";
import { TELEMETRY } from "../telemetry/constants/telemetry";
import {
  type OtlpTarget,
  otlpExporterOptions,
  telemetryResourceAttributes,
} from "../telemetry/otlp";
import { LOG, type LogLevel } from "./constants/logger";

/** File descriptor 1: the process's stdout. */
const STDOUT_FD = 1;

export type LoggerOptions = {
  level: LogLevel;
  /** Pretty lines on the console instead of JSON. */
  development: boolean;
  /** Filed on every shipped line's resource; left out when the Host has none. */
  serviceVersion?: string;
  /** Where lines ship. Unset, nothing ships. */
  otlp?: OtlpTarget;
  /** Writes every line here and nowhere else: tests read lines back through it. */
  destination?: DestinationStream;
};

const prettyTarget = {
  options: { colorize: true },
  target: LOG.TRANSPORT.PRETTY,
} as const;

/** Plain JSON to stdout, as `pino()` writes without a transport. */
const stdoutTarget = {
  options: { destination: STDOUT_FD },
  target: LOG.TRANSPORT.STDOUT,
} as const;

/**
 * Ships every line to the OTLP collector, with the same resource the SDK sends
 * with traces and metrics. The timeout caps the exporter's retries: the worker
 * flushes on exit, and against a down collector the default 10s held every
 * shutdown open.
 */
const otlpTarget = (target: OtlpTarget, serviceVersion?: string) => ({
  options: {
    loggerName: "pino",
    logRecordProcessorOptions: {
      exporterOptions: {
        protobufExporterOptions: {
          ...otlpExporterOptions(target, TELEMETRY.PATH.LOGS),
          timeoutMillis: TELEMETRY.LIMIT.FLUSH_TIMEOUT_MS,
        },
        protocol: "http/protobuf",
      },
      recordProcessorType: "batch",
    },
    resourceAttributes: telemetryResourceAttributes(target, serviceVersion),
    ...(serviceVersion === undefined ? {} : { serviceVersion }),
  },
  target: LOG.TRANSPORT.OTLP,
});

/**
 * The transports a logger writes through: none (pino's own synchronous stdout)
 * in production without a collector, pretty lines in development, and the
 * OTLP transport beside the console whenever `otlp` is set. Each target
 * filters at `info` unless told otherwise, so each carries the logger's level.
 * @internal
 */
export function loggerTargets(
  options: Omit<LoggerOptions, "destination">
): TransportTargetOptions[] {
  const withLevel = (target: TransportTargetOptions) => ({
    ...target,
    level: options.level,
  });

  if (options.otlp) {
    // A transport replaces pino's own stdout, so the console gets a target too.
    const consoleTarget = options.development ? prettyTarget : stdoutTarget;
    return [
      consoleTarget,
      otlpTarget(options.otlp, options.serviceVersion),
    ].map(withLevel);
  }

  return options.development ? [withLevel(prettyTarget)] : [];
}

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

/**
 * One pino logger for any Host: `LOG.REDACT` scrubbed, each line stamped with
 * its trace, pretty in development, and shipped to the collector only when
 * `otlp` is set.
 */
export function createLogger(options: LoggerOptions): Logger {
  const base = {
    level: options.level,
    mixin: traceContext,
    redact: { censor: LOG.REDACT.CENSOR, paths: [...LOG.REDACT.PATHS] },
  };

  if (options.destination) {
    return pino(base, options.destination);
  }

  const targets = loggerTargets(options);
  return targets.length > 0
    ? pino({ ...base, transport: { targets } })
    : pino(base);
}
