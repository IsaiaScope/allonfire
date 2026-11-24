// @module-tag unit

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { appAndUiSources } from "./source-files";

const SOURCES = /\.tsx?$/;
// The call, not the word: this file and the guide say it in prose.
const CALL = /\bURL\.parse\(/;

describe("URL.parse", () => {
  it("is never called in ui or an App: it is Chrome 126 and Safari 18 or later, so on an older phone it throws in the browser (core's hostOf instead)", () => {
    const callers = appAndUiSources(SOURCES)
      .filter((path) => CALL.test(readFileSync(path, "utf8")))
      .map((path) => relative(REPO.ROOT, path));
    expect(callers).toEqual([]);
  });
});
