// @module-tag integration
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { TEST_DATABASE } from "../../src/features/test-database/constants/test-database";
import { liquibase } from "../../src/features/test-database/utils/server";
import {
  dropDatabase,
  recreateDatabase,
  throwawayName,
  throwawayUrl,
} from "./throwaway-db";

const run = promisify(execFile);
const CALLERS = 6;
const IMAGE = "allonfire-db-migrate";
/** One database per caller, as every package's tests have their own: callers sharing one would race on Liquibase's own table. */
const DATABASES = Array.from({ length: CALLERS }, (_, caller) =>
  throwawayName(`migrate_image_${caller}`)
);

/** `status` through scripts/liquibase.sh, asynchronously, as a parallel package's tests call it. */
const status = (database: string) =>
  run("bash", ["scripts/liquibase.sh", "status"], {
    cwd: TEST_DATABASE.PACKAGE_ROOT,
    env: { ...process.env, DATABASE_URL: throwawayUrl(database) },
  });

/** The tags the db-migrate image holds, sorted. */
const tags = () =>
  execFileSync(
    "docker",
    ["images", "--filter", `reference=${IMAGE}`, "--format", "{{.Tag}}"],
    { encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean)
    .sort();

beforeAll(async () => {
  await Promise.all(DATABASES.map(recreateDatabase));
});
afterAll(async () => {
  await Promise.all(DATABASES.map(dropDatabase));
});

describe("scripts/liquibase.sh under parallel callers", () => {
  it(
    "runs six callers at once without losing the image",
    async () => {
      // ponytail: a race has no deterministic reproduction; on the old fixed
      // tag this failed with `No such image` most runs, never on a content tag.
      const results = await Promise.allSettled(DATABASES.map(status));
      // The messages, not only the count: a failure carries Docker's stderr.
      expect(
        results.flatMap((result) =>
          result.status === "rejected" ? [String(result.reason)] : []
        )
      ).toEqual([]);
    },
    TEST_DATABASE.DOCKER_TIMEOUT_MS
  );

  it(
    "adds no image tag when the content is unchanged",
    () => {
      const before = tags();
      liquibase(throwawayUrl(DATABASES[0] ?? ""), "status");
      expect(tags()).toEqual(before);
    },
    TEST_DATABASE.DOCKER_TIMEOUT_MS
  );
});
