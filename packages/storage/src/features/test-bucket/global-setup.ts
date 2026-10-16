import { basename } from "node:path";
import { LOCAL } from "@allonfire/config/local/addresses";
import {
  dropWhenRunEnds,
  runsIntegration,
  testRunStamp,
} from "@allonfire/config/tests/run/test-run";
import type { TestProject } from "vitest/node";

/**
 * Vitest `globalSetup`: a bucket for this package's run, holding every Image
 * Fixture, handed to the workers as `STORAGE_BUCKET`, dropped when the run
 * ends. `image` is never written.
 */
export default async function setup(project: TestProject) {
  if (!runsIntegration(project.config.tagsFilter)) {
    return;
  }
  process.env.STORAGE_ENDPOINT ??= LOCAL.URL.STORAGE;
  process.env.STORAGE_ACCESS_KEY ??= LOCAL.STORAGE.ACCESS_KEY;
  process.env.STORAGE_SECRET_KEY ??= LOCAL.STORAGE.SECRET_KEY;
  // The S3 client reads the env at import: load it once the env is set.
  const { createTestBucket, dropTestBucket } = await import("./bucket");
  const label = basename(project.config.root);
  const stamp = testRunStamp();
  const bucket = await createTestBucket(label, stamp);
  // This project's workers only (see the database global setup).
  project.config.env = { ...project.config.env, STORAGE_BUCKET: bucket };
  return dropWhenRunEnds(() => dropTestBucket(label, stamp));
}
