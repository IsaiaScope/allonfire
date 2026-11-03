import { env } from "../../environment/environment";
import type { ValueOf } from "../../shared/utils/object";
import { TELEMETRY } from "./constants/telemetry";

/** Where a Host's telemetry ships, the auth it ships with, and the name it is filed under. */
export type OtlpTarget = {
  endpoint: string;
  headers: Record<string, string>;
  serviceName: string;
};

/** The parsed telemetry keys of a Host's env (`telemetryEnvSchema` plus its service name). */
export type TelemetryEnv = {
  TELEMETRY_ENDPOINT?: string | undefined;
  TELEMETRY_HEADERS: Record<string, string>;
  TELEMETRY_SERVICE_NAME: string;
};

/** The target a Host's env describes, or none without an endpoint: nothing ships. */
export const otlpTargetFrom = (
  telemetryEnv: TelemetryEnv
): OtlpTarget | undefined =>
  telemetryEnv.TELEMETRY_ENDPOINT
    ? {
        endpoint: telemetryEnv.TELEMETRY_ENDPOINT,
        headers: telemetryEnv.TELEMETRY_HEADERS,
        serviceName: telemetryEnv.TELEMETRY_SERVICE_NAME,
      }
    : undefined;

/**
 * What every trace, metric and log line says about the process that produced
 * it. One function because two pipelines send it: the SDK (traces, metrics) and
 * the pino transport's worker thread (logs). Its own file so the logger can
 * import it without the SDK.
 */
export const telemetryResourceAttributes = (
  target: OtlpTarget,
  serviceVersion?: string
) => ({
  [TELEMETRY.ATTRIBUTE.RESOURCE.SERVICE_NAME]: target.serviceName,
  ...(serviceVersion === undefined
    ? {}
    : { [TELEMETRY.ATTRIBUTE.RESOURCE.SERVICE_VERSION]: serviceVersion }),
  [TELEMETRY.ATTRIBUTE.RESOURCE.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
});

/** Where one signal ships, and the auth it ships with. Same shape for all three. */
export const otlpExporterOptions = (
  target: OtlpTarget,
  path: ValueOf<typeof TELEMETRY.PATH>
) => ({
  headers: target.headers,
  url: `${target.endpoint}${path}`,
});
