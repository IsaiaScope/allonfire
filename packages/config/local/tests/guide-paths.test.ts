// @module-tag unit
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

/** A backticked path, and where a guide counts it from. */
const FROM_ROOT = /^(?:apps|docs|packages)\/\S+$/;
const FROM_APP = /^src\/\S+$/;
const FROM_SOURCE = /^(?:features|shared)\/\S+\.\w+$/;
const CODE_SPAN = /`([^`\s]+)`/g;
/** A glob, a placeholder or braces: a pattern, not one path. */
const PATTERN = /[*<{]/;

/**
 * Every file or folder path a guide names in a code span, resolved: from the
 * repo root, from its App's folder (`src/…`) or from that App's `src`.
 */
const guidePaths = (guide: string, app: string) =>
  [...guide.matchAll(CODE_SPAN)].flatMap(([, path = ""]) => {
    if (PATTERN.test(path)) {
      return [];
    }
    if (FROM_ROOT.test(path)) {
      return [resolve(REPO.ROOT, path)];
    }
    if (FROM_APP.test(path)) {
      return [resolve(app, path)];
    }
    return FROM_SOURCE.test(path) ? [resolve(app, "src", path)] : [];
  });

// Here, not beside each App: only this package's tests re-run when a guide
// alone changes (turbo.json).
describe.each([
  ["api.md", "api"],
  ["laura.md", "laura"],
])("the %s guide", (guide, app) => {
  it("names only paths that exist", () => {
    const paths = guidePaths(
      readFileSync(resolve(REPO.ROOT, "docs", "guides", guide), "utf8"),
      resolve(REPO.APPS, app)
    );

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((path) => !existsSync(path))).toEqual([]);
  });
});
