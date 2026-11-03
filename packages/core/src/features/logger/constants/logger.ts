import { z } from "zod";

/** Mirrors pino's levels, plus `silent` (logs nothing; the tests' default). */
const LEVEL = {
  DEBUG: "debug",
  ERROR: "error",
  FATAL: "fatal",
  INFO: "info",
  SILENT: "silent",
  TRACE: "trace",
  WARN: "warn",
} as const;

export const logLevelSchema = z.enum(LEVEL);
export type LogLevel = z.infer<typeof logLevelSchema>;

/**
 * Paths pino scrubs before anything reaches a transport. Add to this list, not
 * to a call site — a redaction applied at one log statement is one that the
 * next statement forgets. A pino wildcard matches one level, so a key scrubbed
 * "anywhere" is listed once per depth: at the top, one level down, two down.
 * ponytail: three levels cover a request body inside a log object; add a line
 * when something logs deeper.
 */
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "password",
  "*.password",
  "*.*.password",
  "token",
  "*.token",
  "*.*.token",
] as const;

/**
 * Everything about logging every Host shares: `LOG.LEVEL.*`, its messages,
 * what pino redacts, and the transports a line can leave through.
 */
export const LOG = {
  LEVEL,
  /** What a Host logs in its own words, the same in every Host. */
  MESSAGE: {
    /** A request the server failed to answer (Next's `onRequestError`). */
    REQUEST_FAILED: "request failed",
  },
  REDACT: {
    CENSOR: "[Redacted]",
    PATHS: REDACT_PATHS,
  },
  /** pino transport targets, resolved by pino from the logger's own package. */
  TRANSPORT: {
    /** Ships every line to the OTLP collector. */
    OTLP: "pino-opentelemetry-transport",
    /** Coloured, human-readable lines for development. */
    PRETTY: "pino-pretty",
    /** Plain JSON to a file descriptor, as `pino()` writes without a transport. */
    STDOUT: "pino/file",
  },
} as const;
