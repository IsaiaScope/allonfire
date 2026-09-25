import { z } from "zod";

/** Mirrors pino's levels, plus `silent` (logs nothing; the tests' default). */
export const LOG_LEVEL = {
  DEBUG: "debug",
  ERROR: "error",
  FATAL: "fatal",
  INFO: "info",
  SILENT: "silent",
  TRACE: "trace",
  WARN: "warn",
} as const;

export const logLevelSchema = z.enum(LOG_LEVEL);
export type LogLevel = z.infer<typeof logLevelSchema>;

/**
 * Paths pino scrubs before anything reaches a transport. Add to this list, not
 * to a call site — a redaction applied at one log statement is one that the
 * next statement forgets.
 */
export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.token",
] as const;

export const REDACT_CENSOR = "[Redacted]";
