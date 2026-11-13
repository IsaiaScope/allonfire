/** Where a file left behind is told; pino's shape. */
export type LeftoverLog = {
  warn: (details: object, message: string) => void;
};

/**
 * Deletes files no row names any more, after the change that freed them is
 * written: a failure never fails that change, since such a file is invisible,
 * so it is logged with its keys, `reason` and `event`, the stable name a log
 * viewer searches on. `retry` asks once more first,
 * for a file whose public links answer until it is gone.
 */
export const deleteLeftovers = async ({
  event,
  keys,
  log,
  reason,
  remove,
  retry = false,
}: {
  event: string;
  keys: readonly string[];
  log: LeftoverLog;
  reason: string;
  remove: (keys: readonly string[]) => Promise<void>;
  retry?: boolean;
}): Promise<void> => {
  if (keys.length === 0) {
    return;
  }
  await remove(keys)
    .catch((error: unknown) => (retry ? remove(keys) : Promise.reject(error)))
    .catch((error: unknown) => log.warn({ err: error, event, keys }, reason));
};
