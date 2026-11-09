/**
 * What the API tells OpenTelemetry about itself and its spans. How telemetry
 * leaves a Host (paths, env patterns, resource attributes) is core's
 * `TELEMETRY` (`@allonfire/core/features/telemetry/constants/telemetry`).
 */
export const TELEMETRY = {
  ATTRIBUTE: {
    /** Semantic-convention attributes set on server spans in place of `url.full`. */
    URL: {
      FULL: "url.full",
      PATH: "url.path",
      SCHEME: "url.scheme",
    },
  },
  /** Resource name every span, metric and log line is filed under. */
  DEFAULT_SERVICE_NAME: "allonfire-api",
  /** Prisma's one-off startup spans: noise, and each one is its own root trace. */
  PRISMA_STARTUP_SPANS: [
    "prisma:client:detect_platform",
    "prisma:client:load_engine",
  ],
} as const;
