// @module-tag unit

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ponytail: exact-text checks, no shell parser, like the config package's
// local/ tests. The behavior is covered by migrate-image.integration.test.ts.
const SCRIPT = readFileSync(
  resolve(import.meta.dirname, "../../scripts/liquibase.sh"),
  "utf8"
);
const FIXED_TAG = /--tag allonfire-db-migrate\s/;
const CONTENT_TAG = /allonfire-db-migrate:\$\{?\w+/;
const RUN_BY_TAG = /"\$image" "\$@"/;

describe("scripts/liquibase.sh", () => {
  it("tags the image by its content, not a fixed name", () => {
    expect(SCRIPT).not.toMatch(FIXED_TAG);
    expect(SCRIPT).toMatch(CONTENT_TAG);
  });

  it("skips the build when the tag exists", () => {
    expect(SCRIPT).toContain("docker image inspect");
  });

  it("runs the image by its tag, not an ID a parallel build can orphan", () => {
    expect(SCRIPT).not.toContain("image=$(docker build");
    expect(SCRIPT).toMatch(RUN_BY_TAG);
  });
});
