// @module-tag unit

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

// ponytail: exact-text checks, no shell parser, like workflows.test.ts.
const PREVIEW = "packages/config/local/preview.sh";
const APP_NAME = /back-office|laura/;
const HARDCODED_PORT = /PORT=\d/;

it("serves any App's production build from one shared script", () => {
  const script = read(PREVIEW);
  // The App is the folder pnpm runs the script in; its port is an argument.
  expect(script).not.toMatch(APP_NAME);
  expect(script).not.toMatch(HARDCODED_PORT);
  expect(script).toContain("basename");
  expect(script).toContain(".next/standalone");
});

it("gives the Back Office its preview port and no script of its own", () => {
  expect(read("apps/back-office/package.json")).toContain(
    '"preview": "bash ../../packages/config/local/preview.sh 3420"'
  );
});
