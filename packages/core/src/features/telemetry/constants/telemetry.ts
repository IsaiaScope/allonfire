import { UNIT } from "../../../shared/constants/units";

/**
 * The OTLP protocol's own version segment in the collector's URL. Not a
 * Host's route version: this one is fixed by the OpenTelemetry spec.
 */
const SIGNAL_PREFIX = "/v1";

/**
 * How telemetry leaves a Host (OTLP over HTTP, to `TELEMETRY_ENDPOINT`) and
 * the resource it describes itself with. A Host's own span attributes and
 * defaults stay with the Host.
 */
export const TELEMETRY = {
  ATTRIBUTE: {
    /** Resource attributes shared by traces, metrics and logs. */
    RESOURCE: {
      DEPLOYMENT_ENVIRONMENT: "deployment.environment.name",
      SERVICE_NAME: "service.name",
      SERVICE_VERSION: "service.version",
    },
  },
  DEFAULT: {
    /**
     * The name a Next App's server telemetry is filed under when
     * `TELEMETRY_SERVICE_NAME` is unset; the API keeps its own default.
     */
    SERVICE_NAME: "allonfire-back-office",
  },
  ERROR: {
    HEADERS_MALFORMED_ESCAPE:
      "each header value must be valid percent-encoding",
  },
  LIMIT: {
    /**
     * How long a final flush is allowed to take. The OTLP exporter retries an
     * unreachable collector for ~8s; tsx watch force-kills after 5s and Docker
     * after 10s, so the flush gets less than either.
     */
    FLUSH_TIMEOUT_MS: 2 * UNIT.MS_PER_SECOND,
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
} as const;
