/**
 * A Next App's server OpenTelemetry SDK, started by `instrumentation.ts` on the
 * Node runtime. It exports the spans Next itself records (requests, renders,
 * fetches) and the server's log lines to `TELEMETRY_ENDPOINT`; without one
 * nothing starts and nothing ships. Core's `serverLogger` emits every line to
 * the OpenTelemetry logs API in the process (pino's worker transport cannot
 * load in a Next bundle), and the log processor here exports them, each with
 * the span it was logged in. Export failures reach the server log as
 * warnings, and never throw into a request.
 */

import { DiagLogLevel, diag } from "@opentelemetry/api";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { logs, NodeSDK } from "@opentelemetry/sdk-node";
import { telemetryEnv } from "../../../environment/telemetry-environment";
import { TELEMETRY } from "../../telemetry/constants/telemetry";
import { pinoDiagLogger } from "../../telemetry/diag-logger";
import {
  otlpExporterOptions,
  otlpTargetFrom,
  telemetryResourceAttributes,
} from "../../telemetry/otlp";
import { serverLogger } from "../logger/server-logger";

/** Starts the SDK when `env` names an endpoint; Next calls `register` once. */
export function startTelemetry(env = telemetryEnv): void {
  const target = otlpTargetFrom(env);
  if (!target) {
    return;
  }
  diag.setLogger(pinoDiagLogger(serverLogger()), DiagLogLevel.WARN);
  new NodeSDK({
    logRecordProcessors: [
      new logs.BatchLogRecordProcessor({
        exporter: new OTLPLogExporter(
          otlpExporterOptions(target, TELEMETRY.PATH.LOGS)
        ),
      }),
    ],
    // Metrics ship nowhere yet. Left undefined, the SDK would build an
    // env-configured pipeline.
    metricReaders: [],
    resource: resourceFromAttributes(telemetryResourceAttributes(target)),
    serviceName: target.serviceName,
    traceExporter: new OTLPTraceExporter(
      otlpExporterOptions(target, TELEMETRY.PATH.TRACES)
    ),
  }).start();
}
