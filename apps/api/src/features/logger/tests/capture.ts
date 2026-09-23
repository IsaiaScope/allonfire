import { createLogger } from "../logger";

export type LogLine = { level: number; msg: string } & Record<string, unknown>;

/** A real logger whose output is parsed into `lines` instead of written out. */
export function captureLog() {
  const lines: LogLine[] = [];
  const logger = createLogger({
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk)) },
  });
  return { lines, logger };
}
