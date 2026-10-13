import { randomBytes } from "node:crypto";

// A leaf package: core's time units are out of reach here.
const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * MS_PER_SECOND;

/**
 * What a Test run owns, a Test database (`_`) or a bucket (`-`, S3 allows no
 * underscore): `allonfire<sep>test<sep><label><sep><epoch><sep><suffix>`.
 */
const TEST_RUN_NAME =
  /^allonfire[_-]test[_-][a-z0-9_-]+[_-](\d+)[_-][a-z0-9]{6}$/;
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SUFFIX_LENGTH = 6;
/**
 * A run younger than this is still going: `pnpm test:ui` holds its own for a
 * whole working session.
 */
const STALE_AFTER_MS = MS_PER_DAY;

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
 * A run's stamp, `<epoch seconds>_<suffix>`, naming what it owns. An e2e run
 * makes one for its database and bucket; under Vitest each global setup makes
 * its own, so a package's database and bucket carry different stamps.
 */
export const testRunStamp = (now = new Date()) =>
  `${Math.floor(now.getTime() / MS_PER_SECOND)}_${suffix()}`;

/** A crashed run's database or bucket, over a day old; nothing else ever is. */
export function isStaleTestRun(name: string, now: Date): boolean {
  return (
    TEST_RUN_NAME.test(name) &&
    now.getTime() - Number(name.replace(TEST_RUN_NAME, "$1")) * MS_PER_SECOND >
      STALE_AFTER_MS
  );
}
