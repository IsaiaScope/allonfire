import { randomBytes } from "node:crypto";

// A leaf package: core's time units are out of reach here.
const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * MS_PER_SECOND;

/**
 * What a Test run owns, a Test database (`_`) or a bucket (`-`, S3 allows no
 * underscore): `aof<sep>test<sep><label><sep><YYMMDD><sep><HHMMSS><sep>p<pid><sep><suffix>`,
 * the time in UTC, `p<pid>` the process that holds it. A template's name has
 * no `p<pid>`.
 */
export const TEST_RUN = {
  /** A name Postgres keeps whole: it cuts an identifier at 63 bytes, S3 allows 63 characters. */
  MAX_NAME_LENGTH: 63,
  /** Every Test run's name starts with it, spelled with its separator. */
  PREFIX: "aof_test_",
  /** A stamp's random suffix; a template's fingerprint is cut to it, so it parses too. */
  SUFFIX_LENGTH: 6,
} as const;
const TEST_RUN_NAME = new RegExp(
  `^aof[_-]test[_-](?<label>[a-z0-9_-]+)[_-](?<year>\\d{2})(?<month>\\d{2})(?<day>\\d{2})[_-](?<hour>\\d{2})(?<minute>\\d{2})(?<second>\\d{2})(?:[_-]p(?<pid>\\d+))?[_-][a-z0-9]{${TEST_RUN.SUFFIX_LENGTH}}$`
);
/** An ISO string, `2026-11-20T10:07:48.000Z`, cut into the stamp's date and time. */
const ISO_STAMP =
  /^\d{2}(\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d{3}Z$/;
/** What a name may hold: Postgres takes it unquoted, and DDL takes no bind parameter. */
const SAFE_NAME = /^[a-z0-9_]+$/;
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
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
  Array.from(randomBytes(TEST_RUN.SUFFIX_LENGTH), (byte) =>
    SUFFIX_ALPHABET.charAt(byte % SUFFIX_ALPHABET.length)
  ).join("");

/**
 * Only a run filtered to `unit` alone (`--tags-filter=unit`) skips the Test
 * database and bucket. Any other filter might reach an integration test,
 * which must never fall back to the Local database or bucket.
 */
export const runsIntegration = (tagsFilter: readonly string[] | undefined) =>
  !tagsFilter?.length || tagsFilter.some((filter) => filter !== "unit");

/** A moment as `<YYMMDD>_<HHMMSS>` in UTC: it reads as a date and sorts by time. */
export const stampTime = (epochSeconds: number) =>
  new Date(epochSeconds * MS_PER_SECOND)
    .toISOString()
    .replace(ISO_STAMP, "$1$2$3_$4$5$6");

/**
 * A run's stamp, `<YYMMDD>_<HHMMSS>_p<pid>_<suffix>`, naming what it owns and
 * the process that holds it, the one that made the stamp. An e2e run makes
 * one in Playwright's main process for its database and bucket; under Vitest
 * each global setup makes its own, so a package's database and bucket carry
 * different stamps.
 */
export const testRunStamp = (now = new Date()) =>
  `${stampTime(Math.floor(now.getTime() / MS_PER_SECOND))}_p${process.pid}_${suffix()}`;

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
  const parts = name.match(TEST_RUN_NAME)?.groups;
  if (parts === undefined) {
    return false;
  }
  const { year, month, day, hour, minute, second, pid } = parts;
  const startedAt = Date.parse(
    `20${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  );
  return (
    now.getTime() - startedAt > STALE_AFTER_MS ||
    (pid !== undefined && !isRunning(Number(pid)))
  );
}

/** A database's name spells the label with `_`, a bucket's with `-`. */
const spelled = (label: string) => label.toLowerCase().replaceAll("-", "_");

/**
 * What a run labelled `label` owns, from its stamp (`testRunStamp`): a Test
 * database with `_`, a bucket with `-` (S3 allows no underscore). Anything
 * but lowercase, digits and separators throws before any SQL or S3 call.
 */
export function testRunName(
  label: string,
  stamp: string,
  separator: "_" | "-" = "_"
): string {
  const name = `${TEST_RUN.PREFIX}${spelled(label)}_${stamp}`;
  if (!SAFE_NAME.test(name) || name.length > TEST_RUN.MAX_NAME_LENGTH) {
    throw new Error(`Not a safe Test run name: ${name}`);
  }
  return name.replaceAll("_", separator);
}

/** Whether `name` is the Test database or bucket of a run labelled `label`. */
export function isTestRunOf(name: string, label: string): boolean {
  const found = name.match(TEST_RUN_NAME)?.groups?.label;
  return found !== undefined && spelled(found) === spelled(label);
}

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
