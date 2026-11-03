/** Where a file left behind is told; pino's shape. */
export type LeftoverLog = {
  warn: (details: object, message: string) => void;
};

/**
 * Deletes files no row names any more, after the change that freed them is
 * written: a failure never fails that change, since such a file is invisible,
 * so it is logged with its keys and `reason`. `retry` asks once more first,
 * for a file whose public links answer until it is gone.
 */
export const deleteLeftovers = async ({
  keys,
  log,
  reason,
  remove,
  retry = false,
}: {
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
    .catch((error: unknown) => log.warn({ err: error, keys }, reason));
};
