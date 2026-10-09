import { LOG_LEVEL } from "@allonfire/core/features/logger/constants/logger";
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { z } from "zod";
import { createLogger } from "../logger";

const logLineSchema = z.looseObject({ level: z.number(), msg: z.string() });
export type LogLine = z.infer<typeof logLineSchema>;

/**
 * A real logger whose output is parsed into `lines` instead of written out.
 * It logs at `debug` whatever `LOG_LEVEL` says: tests run with it `silent`.
 */
export function captureLog() {
  const lines: LogLine[] = [];
  // The text pino wrote, for checks that nothing secret reached it at all.
  const output: string[] = [];
  const logger = createLogger({
    destination: {
      write: (chunk: string) => {
        output.push(chunk);
        lines.push(parseJsonWith(chunk, logLineSchema));
      },
    },
  });
  logger.level = LOG_LEVEL.DEBUG;
  return { lines, logger, output: () => output.join("") };
}

/** pino's numeric level for `info`, to filter `lines` at or above it. */
export function infoLevel(logger: ReturnType<typeof captureLog>["logger"]) {
  return logger.levels.values[LOG_LEVEL.INFO] ?? 0;
}
