import { randomBytes } from "node:crypto";

// A leaf package: core's time units are out of reach here.
const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * MS_PER_SECOND;

/**
 * What a Test run owns, a Test database (`_`) or a bucket (`-`, S3 allows no
 * underscore): `allonfire<sep>test<sep><label><sep><epoch><sep><pid><sep><suffix>`,
 * `<pid>` the process that holds it. A template's name has no `<pid>`.
 */
const TEST_RUN_NAME =
  /^allonfire[_-]test[_-]([a-z0-9_-]+)[_-](\d{10})(?:[_-](\d+))?[_-][a-z0-9]{6}$/;
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SUFFIX_LENGTH = 6;
/**
 * The age after which a name is stale whatever its `<pid>` says: the number
 * could belong to another process by then, and a template has none.
 */
const STALE_AFTER_MS = MS_PER_DAY;
/**
 * What ends a run without its teardown and lets `drop` finish: a closed
 * terminal. On SIGINT Vitest tears down by itself; on SIGTERM it exits a
 * millisecond later, before any drop ends, so a run ended that way, or
 * killed, is left to the next run's sweep, which sees its process gone.
 */
const END_SIGNALS = ["SIGHUP"] as const;

const suffix = () =>
  Array.from(randomBytes(SUFFIX_LENGTH), (byte) =>
    SUFFIX_ALPHABET.charAt(byte % SUFFIX_ALPHABET.length)
  ).join("");

/**
 * Only a run filtered to `unit` alone (`--tags-filter=unit`) skips the Test
 * database and bucket. Any other filter might reach an integration test,
 * which must never fall back to the Local database or bucket.
 */
export const runsIntegration = (tagsFilter: readonly string[] | undefined) =>
  !tagsFilter?.length || tagsFilter.some((filter) => filter !== "unit");

/**
 * A run's stamp, `<epoch seconds>_<pid>_<suffix>`, naming what it owns and
 * the process that holds it, the one that made the stamp. An e2e run makes
 * one in Playwright's main process for its database and bucket; under Vitest
 * each global setup makes its own, so a package's database and bucket carry
 * different stamps.
 */
export const testRunStamp = (now = new Date()) =>
  `${Math.floor(now.getTime() / MS_PER_SECOND)}_${process.pid}_${suffix()}`;

/** Whether process `pid` still runs; one owned by another user does too. */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}

/**
 * An ended run's database or bucket: its process is gone, or it is over a
 * day old. A run still going, `pnpm test:ui` for a whole working session
 * included, never is; nothing else ever is.
 */
export function isStaleTestRun(
  name: string,
  now: Date,
  isRunning: (pid: number) => boolean = isProcessRunning
): boolean {
  const [, , epoch, pid] = name.match(TEST_RUN_NAME) ?? [];
  if (epoch === undefined) {
    return false;
  }
  return (
    now.getTime() - Number(epoch) * MS_PER_SECOND > STALE_AFTER_MS ||
    (pid !== undefined && !isRunning(Number(pid)))
  );
}

/** A database's name spells the label with `_`, a bucket's with `-`. */
const spelled = (label: string) => label.toLowerCase().replaceAll("-", "_");

/** Whether `name` is the Test database or bucket of a run labelled `label`. */
export const isTestRunOf = (name: string, label: string) =>
  TEST_RUN_NAME.test(name) &&
  spelled(name.replace(TEST_RUN_NAME, "$1")) === spelled(label);

/**
 * A global setup's teardown for what its run owns. Vitest runs it when the
 * run ends and on Ctrl-C, never on `END_SIGNALS`, so `drop` runs then too;
 * the process exits once every setup's drop has ended. A run ended any other
 * way leaves its own behind for the next run's sweep (`isStaleTestRun`).
 */
export function dropWhenRunEnds(
  drop: () => Promise<unknown>,
  exit: () => void = () => process.exit(1)
): () => Promise<void> {
  let dropping = false;
  const stopListening = () => {
    for (const signal of END_SIGNALS) {
      process.off(signal, onEnd);
    }
  };
  const ended = () => {
    stopListening();
    // Another setup's drop is still going while its listener is there.
    if (END_SIGNALS.every((signal) => process.listenerCount(signal) === 0)) {
      exit();
    }
  };
  function onEnd() {
    if (dropping) {
      return;
    }
    dropping = true;
    // A drop that fails here has nobody to tell: the sweep takes what it left.
    drop().then(ended, ended);
  }
  for (const signal of END_SIGNALS) {
    process.on(signal, onEnd);
  }
  return async () => {
    stopListening();
    await drop();
  };
}
