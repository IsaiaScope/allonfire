import { basename } from "node:path";
import { LOCAL } from "@allonfire/config/local/addresses";
import {
  runsIntegration,
  testRunStamp,
} from "@allonfire/config/tests/run/test-run";
import type { TestProject } from "vitest/node";
import { createTestDatabase, dropTestDatabase } from "./test-database";

/**
 * Vitest `globalSetup`: a Test database for this package's run, cloned from
 * the template and handed to the workers as `DATABASE_URL` (they start after
 * this runs), dropped when the run ends. The Local database is never written.
 */
export default async function setup(project: TestProject) {
  if (!runsIntegration(project.config.tagsFilter)) {
    return;
  }
  const server = process.env.DATABASE_URL ?? LOCAL.URL.DATABASE;
  const label = basename(project.config.root);
  const stamp = testRunStamp();
  const url = await createTestDatabase(server, label, stamp);
  // This project's workers only: under the root config every project's setup
  // runs in one process, so process.env would hand all of them the last clone.
  project.config.env = { ...project.config.env, DATABASE_URL: url };
  return () => dropTestDatabase(server, label, stamp);
}
