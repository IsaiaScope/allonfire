// @module-tag unit

import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { REPO } from "../repo";

// ponytail: plain fs and a regex, config imports nothing, core's helpers included.

/** Files that catalogue per App on purpose (package-layout.md), each with its reason. */
const ALLOWED = [
  "packages/database/src/features/auth/access/", // the Role and App rules
  "packages/database/src/features/seed/", // fixtures per App
  "packages/database/src/features/apps/", // `database/apps/laura`
  "packages/design/src/apps/", // per-App Design files
] as const;

/** What a package's source must not say: an App by name, or a path into an App. */
const NAMES_AN_APP =
  /App\.BACK_OFFICE|App\.LAURA|"BACK_OFFICE"|"LAURA"|@allonfire\/back-office|@allonfire\/laura|\/apps\//;

const SOURCE = /\.(?:ts|tsx)$/;
const SKIPPED =
  /(?:^|\/)(?:tests|generated|node_modules)\/|\.test\.|\.test-d\.|\/\._|^\._/;

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.name.startsWith("._") || entry.name === "node_modules") {
      return [];
    }
    return entry.isDirectory() ? filesUnder(path) : [path];
  });

const sources = readdirSync(REPO.PACKAGES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    try {
      return filesUnder(resolve(REPO.PACKAGES, entry.name, "src"));
    } catch {
      return [];
    }
  })
  .map((path) => relative(REPO.ROOT, path))
  .filter((path) => SOURCE.test(path) && !SKIPPED.test(path));

describe("packages name no App", () => {
  it("names no App outside the catalogue folders", () => {
    const offenders = sources
      .filter((path) => !ALLOWED.some((allowed) => path.startsWith(allowed)))
      .flatMap((path) =>
        readFileSync(resolve(REPO.ROOT, path), "utf8")
          .split("\n")
          .flatMap((line, index) =>
            NAMES_AN_APP.test(line)
              ? [`${path}:${index + 1}: ${line.trim()}`]
              : []
          )
      );
    expect(offenders).toEqual([]);
  });
});
