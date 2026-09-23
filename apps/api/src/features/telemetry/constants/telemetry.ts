/** Resource name every span, metric and log line is filed under. */
export const DEFAULT_OTEL_SERVICE_NAME = "allonfire-api";

/**
 * The OTLP protocol version in the collector's URL. Not `API_VERSION_PREFIX`:
 * that one versions our own routes and moves when we break them; this one is
 * fixed by the OpenTelemetry spec.
 */
const OTLP_VERSION = "/v1";

/**
 * Per-signal paths appended to `OTEL_EXPORTER_OTLP_ENDPOINT`. The exporters add
 * them only when they read the endpoint from `process.env` themselves; passed
 * explicitly, as here, the URL must be complete.
 */
export const OTLP_PATH = {
  LOGS: `${OTLP_VERSION}/logs`,
  METRICS: `${OTLP_VERSION}/metrics`,
  TRACES: `${OTLP_VERSION}/traces`,
} as const;

/** Stripped from the endpoint so appending an `OTLP_PATH` never yields `//v1`. */
export const TRAILING_SLASHES = /\/+$/;

/** OTLP over HTTP only: a gRPC or bare `host:port` endpoint is a typo here. */
export const OTLP_PROTOCOL_PATTERN = /^https?$/;

/** `key=value,key=value`, each value percent-encoded, per the OTel spec. */
export const OTLP_HEADERS_PATTERN = /^[^=,]+=[^,]+(,[^=,]+=[^,]+)*$/;

export const OTLP_HEADERS_MALFORMED_ESCAPE =
  "each header value must be valid percent-encoding";

/** Semantic-convention attributes set on server spans in place of `url.full`. */
export const URL_ATTRIBUTE = {
  FULL: "url.full",
  PATH: "url.path",
  SCHEME: "url.scheme",
} as const;

/** Resource attributes shared by traces, metrics and logs. */
export const RESOURCE_ATTRIBUTE = {
  DEPLOYMENT_ENVIRONMENT: "deployment.environment.name",
  SERVICE_NAME: "service.name",
  SERVICE_VERSION: "service.version",
} as const;

/** Prisma's one-off startup spans: noise, and each one is its own root trace. */
export const PRISMA_STARTUP_SPANS = [
  "prisma:client:detect_platform",
  "prisma:client:load_engine",
] as const;
