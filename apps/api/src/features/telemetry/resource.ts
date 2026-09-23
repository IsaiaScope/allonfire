import type { ValueOf } from "@allonfire/utils/object";
import pkg from "../../../package.json" with { type: "json" };
import { env } from "../environment/environment";
import { type OTLP_PATH, RESOURCE_ATTRIBUTE } from "./constants/telemetry";

/**
 * What every trace, metric and log line says about the process that produced
 * it. One function because two pipelines send it: the SDK (traces, metrics) and
 * the pino transport's worker thread (logs). Its own file so the logger can
 * import it without the SDK.
 */
export const telemetryResourceAttributes = () => ({
  [RESOURCE_ATTRIBUTE.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
  [RESOURCE_ATTRIBUTE.SERVICE_VERSION]: pkg.version,
  [RESOURCE_ATTRIBUTE.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
});

/** Where one signal ships, and the auth it ships with. Same shape for all three. */
export const otlpExporterOptions = (
  endpoint: string,
  path: ValueOf<typeof OTLP_PATH>
) => ({
  headers: env.OTEL_EXPORTER_OTLP_HEADERS,
  url: `${endpoint}${path}`,
});
