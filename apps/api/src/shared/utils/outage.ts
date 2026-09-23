import type { Logger } from "pino";

export type OutageMessages = { down: string; recovered: string };

/**
 * Logs one line when a dependency starts failing and one when it comes back,
 * nothing in between. A dependency that fails on every request, or every
 * reconnect attempt, would otherwise bury the log in identical lines.
 */
export function outageLatch(logger: Logger, messages: OutageMessages) {
  let down = false;
  return {
    fail(err: unknown): void {
      if (!down) {
        down = true;
        logger.warn({ err }, messages.down);
      }
    },
    ok(): void {
      if (down) {
        down = false;
        logger.info(messages.recovered);
      }
    },
  };
}
