/**
 * The OTLP protocol's own version segment in the collector's URL. Not
 * `API.PATH.VERSION`: that one versions our own routes and moves when we break
 * them; this one is fixed by the OpenTelemetry spec.
 */
const SIGNAL_PREFIX = "/v1";

/**
 * How telemetry leaves the API (OTLP over HTTP, to `TELEMETRY_ENDPOINT`) and
 * what it tells OpenTelemetry about itself and its spans.
 */
export const TELEMETRY = {
  ATTRIBUTE: {
    /** Resource attributes shared by traces, metrics and logs. */
    RESOURCE: {
      DEPLOYMENT_ENVIRONMENT: "deployment.environment.name",
      SERVICE_NAME: "service.name",
      SERVICE_VERSION: "service.version",
    },
    /** Semantic-convention attributes set on server spans in place of `url.full`. */
    URL: {
      FULL: "url.full",
      PATH: "url.path",
      SCHEME: "url.scheme",
    },
  },
  /** Resource name every span, metric and log line is filed under. */
  DEFAULT_SERVICE_NAME: "allonfire-api",
  ERROR: {
    HEADERS_MALFORMED_ESCAPE:
      "each header value must be valid percent-encoding",
  },
  /**
   * Per-signal paths appended to `TELEMETRY_ENDPOINT`. The exporters
   * add them only when they read the endpoint from `process.env` themselves;
   * passed explicitly, as here, the URL must be complete.
   */
  PATH: {
    LOGS: `${SIGNAL_PREFIX}/logs`,
    METRICS: `${SIGNAL_PREFIX}/metrics`,
    TRACES: `${SIGNAL_PREFIX}/traces`,
  },
  PATTERN: {
    /** `key=value,key=value`, each value percent-encoded, per the OTel spec. */
    HEADERS: /^[^=,]+=[^,]+(,[^=,]+=[^,]+)*$/,
    /** OTLP over HTTP only: a gRPC or bare `host:port` endpoint is a typo here. */
    PROTOCOL: /^https?$/,
  },
  /** Prisma's one-off startup spans: noise, and each one is its own root trace. */
  PRISMA_STARTUP_SPANS: [
    "prisma:client:detect_platform",
    "prisma:client:load_engine",
  ],
} as const;
