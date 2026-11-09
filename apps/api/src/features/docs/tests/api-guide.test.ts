// @module-tag unit
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";

/** The guide to this App: `docs/guides/api.md`. */
const GUIDE = resolve(REPO.ROOT, "docs", "guides", "api.md");
const APP = resolve(REPO.APPS, "api");
const SOURCE = resolve(APP, "src");

/** A backticked path, and where the guide counts it from. */
const FROM_ROOT = /^(?:apps|docs|packages)\/\S+$/;
const FROM_APP = /^src\/\S+$/;
const FROM_SOURCE = /^(?:features|shared)\/\S+\.\w+$/;
const CODE_SPAN = /`([^`\s]+)`/g;
const GLOB = "*";

/** Every file or folder path the guide names in a code span, resolved. */
const namedPaths = () =>
  [...readFileSync(GUIDE, "utf8").matchAll(CODE_SPAN)].flatMap(([, path]) => {
    if (path === undefined || path.includes(GLOB)) {
      return [];
    }
    if (FROM_ROOT.test(path)) {
      return [resolve(REPO.ROOT, path)];
    }
    if (FROM_APP.test(path)) {
      return [resolve(APP, path)];
    }
    return FROM_SOURCE.test(path) ? [resolve(SOURCE, path)] : [];
  });

describe("the API guide", () => {
  it("names only paths that exist", () => {
    const paths = namedPaths();

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((path) => !existsSync(path))).toEqual([]);
  });
});
