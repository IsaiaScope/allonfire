// @module-tag unit

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { appAndUiSources } from "../../../shared/tests/source-files";

const INSET = "safe-area-inset-left";

/**
 * The only places that read the screen's left inset: the stylesheet that
 * names the gutters, and the frame, which decides who clears the notch (the
 * docked sidebar or the page) and publishes `--frame-inset-left`. A page
 * reads that variable (or a ui page variant does), never `env()`: a page that
 * reads the notch itself clears it twice beside a docked sidebar and leaves a
 * gap there in landscape (Laura's Gallery did, 2026-11-24).
 */
const READERS = new Set([
  "packages/ui/src/features/navigation/components/aof-section-page.tsx",
  "packages/ui/src/features/navigation/components/aof-sidebar.tsx",
  "packages/ui/src/styles/base.css",
]);

const SOURCES = /\.(css|tsx?)$/;

describe("the screen's left inset", () => {
  it("is read only by the frame and the page it hands it to, never by an App's page", () => {
    const readers = appAndUiSources(SOURCES)
      .filter((path) => readFileSync(path, "utf8").includes(INSET))
      .map((path) => relative(REPO.ROOT, path))
      .filter((path) => !READERS.has(path));
    expect(readers).toEqual([]);
  });
});
