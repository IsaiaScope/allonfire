import { LOG_LEVEL } from "@allonfire/utils/constants/logger";
import { createLogger } from "../logger";

export type LogLine = { level: number; msg: string } & Record<string, unknown>;

/**
 * A real logger whose output is parsed into `lines` instead of written out.
 * It logs at `debug` whatever `LOG_LEVEL` says: tests run with it `silent`.
 */
export function captureLog() {
  const lines: LogLine[] = [];
  const logger = createLogger({
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk)) },
  });
  logger.level = LOG_LEVEL.DEBUG;
  return { lines, logger };
}

/** pino's numeric level for `info`, to filter `lines` at or above it. */
export function infoLevel(logger: ReturnType<typeof captureLog>["logger"]) {
  return logger.levels.values[LOG_LEVEL.INFO] ?? 0;
}
