import { basename } from "node:path";
import {
  dropWhenRunEnds,
  runsIntegration,
  testRunStamp,
} from "@allonfire/config/tests/run/test-run";
import type { TestProject } from "vitest/node";
import { fillLocalStorageEnv } from "./local-env";

/**
 * Vitest `globalSetup`: a bucket for this package's run, holding every Image
 * Fixture, handed to the workers as `STORAGE_BUCKET`, dropped when the run
 * ends. `image` is never written.
 */
export default async function setup(project: TestProject) {
  if (!runsIntegration(project.config.tagsFilter)) {
    return;
  }
  fillLocalStorageEnv();
  // The S3 client reads the env at import: load it once the env is set.
  const { createTestBucket, dropTestBucket } = await import("./bucket");
  const label = basename(project.config.root);
  const stamp = testRunStamp();
  const bucket = await createTestBucket(label, stamp);
  // This project's workers only (see the database global setup).
  project.config.env = { ...project.config.env, STORAGE_BUCKET: bucket };
  return dropWhenRunEnds(() => dropTestBucket(label, stamp));
}
