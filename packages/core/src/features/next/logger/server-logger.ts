import {
  type AnyValue,
  type AnyValueMap,
  logs,
  SeverityNumber,
} from "@opentelemetry/api-logs";
import pino, { type DestinationStream, type Logger } from "pino";
import { z } from "zod";
import { telemetryEnv } from "../../../environment/telemetry-environment";
import { ENV, type NodeEnv } from "../../../shared/constants/env";
import { parseJsonWith } from "../../../shared/utils/json";
import { objectEntries, objectFromEntries } from "../../../shared/utils/object";
import { LOG, type LogLevel } from "../../logger/constants/logger";
import { createLogger } from "../../logger/create-logger";
import {
  type OtlpTarget,
  otlpTargetFrom,
  type TelemetryEnv,
} from "../../telemetry/otlp";

/** File descriptor 1: the process's stdout. */
const STDOUT_FD = 1;

/** What a Next server's logger is built from: its telemetry env and `NODE_ENV`. */
type ServerLoggerEnv = TelemetryEnv & { NODE_ENV: NodeEnv };

type ServerLoggerOptions = {
  level: LogLevel;
  /** Where lines ship, through the OpenTelemetry logs API. Unset, nothing ships. */
  otlp?: OtlpTarget;
  /** The console stream; stdout unless a test captures it. */
  destination?: DestinationStream;
};

/** OpenTelemetry's severity for each pino level a line can carry. */
const SEVERITY = {
  [LOG.LEVEL.TRACE]: SeverityNumber.TRACE,
  [LOG.LEVEL.DEBUG]: SeverityNumber.DEBUG,
  [LOG.LEVEL.INFO]: SeverityNumber.INFO,
  [LOG.LEVEL.WARN]: SeverityNumber.WARN,
  [LOG.LEVEL.ERROR]: SeverityNumber.ERROR,
  [LOG.LEVEL.FATAL]: SeverityNumber.FATAL,
} as const satisfies Record<
  Exclude<LogLevel, typeof LOG.LEVEL.SILENT>,
  SeverityNumber
>;

/** A line's numeric pino level to its OpenTelemetry severity and text. */
const SEVERITY_OF_LEVEL = new Map(
  objectEntries(SEVERITY).map(([label, severityNumber]) => [
    pino.levels.values[label],
    { severityNumber, severityText: label.toUpperCase() },
  ])
);

/** Fields pino writes on every line, or the SDK records on its own. */
const LINE_FIELDS = new Set([
  "hostname",
  "level",
  "msg",
  "pid",
  "span_id",
  "time",
  "trace_flags",
  "trace_id",
]);

const lineSchema = z.looseObject({
  level: z.number(),
  msg: z.string().optional(),
  time: z.number().optional(),
});

/** A parsed JSON value as an OpenTelemetry attribute value. */
const toAnyValue = (value: unknown): AnyValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toAnyValue);
  }
  if (typeof value === "object") {
    return toAnyValueMap(value);
  }
  return null;
};

const toAnyValueMap = (value: object): AnyValueMap =>
  objectFromEntries(
    objectEntries(value).map(([key, field]) => [key, toAnyValue(field)])
  );

/**
 * Every line, emitted to the OpenTelemetry logs API under `serviceName`, in
 * the process: pino's worker transport loads its target by name at runtime,
 * which a Next build does not trace. Written synchronously from the log call,
 * so the SDK stamps the record with the active span. Until an SDK registers a
 * logger provider (`instrumentation.node.ts`), the API drops every record.
 */
const openTelemetryStream = (serviceName: string): DestinationStream => {
  const otelLogger = logs.getLogger(serviceName);
  return {
    write: (text: string) => {
      const { level, msg, time, ...fields } = parseJsonWith(text, lineSchema);
      otelLogger.emit({
        attributes: toAnyValueMap(
          objectFromEntries(
            objectEntries(fields).filter(([key]) => !LINE_FIELDS.has(key))
          )
        ),
        ...(msg === undefined ? {} : { body: msg }),
        ...SEVERITY_OF_LEVEL.get(level),
        ...(time === undefined ? {} : { timestamp: time }),
      });
    },
  };
};

/**
 * A Next server's logger options: silent in tests, and shipped to the
 * collector only when `TELEMETRY_ENDPOINT` is set. No `serviceVersion`: an
 * App's version is not on its server.
 * @internal
 */
export const serverLoggerOptions = (
  env: ServerLoggerEnv
): ServerLoggerOptions => {
  const otlp = otlpTargetFrom(env);
  return {
    level: env.NODE_ENV === ENV.NODE.TEST ? LOG.LEVEL.SILENT : LOG.LEVEL.INFO,
    ...(otlp && { otlp }),
  };
};

/**
 * Core's logger with JSON lines on the console (pino's pretty printer is a
 * worker transport too, which a Next bundle cannot load) and, with an OTLP
 * target, every line also to the OpenTelemetry logs API, never through a
 * worker.
 * @internal
 */
export const buildServerLogger = ({
  level,
  otlp,
  destination = pino.destination(STDOUT_FD),
}: ServerLoggerOptions): Logger =>
  createLogger({
    destination: otlp
      ? pino.multistream([
          // The logger filters by its own level; each stream takes every line.
          { level: LOG.LEVEL.TRACE, stream: destination },
          {
            level: LOG.LEVEL.TRACE,
            stream: openTelemetryStream(otlp.serviceName),
          },
        ])
      : destination,
    development: false,
    level,
  });

let logger: Logger | undefined;

/**
 * The Next server's one logger, built on first use from `telemetryEnv`: its
 * Server Components, server actions, proxy and `onRequestError` log through
 * it. A `destination` (tests) gets a logger of its own whose console lines go
 * there.
 */
export const serverLogger = ({
  destination,
}: {
  destination?: DestinationStream;
} = {}): Logger => {
  if (destination) {
    return buildServerLogger({
      ...serverLoggerOptions(telemetryEnv),
      destination,
    });
  }
  logger ??= buildServerLogger(serverLoggerOptions(telemetryEnv));
  return logger;
};
