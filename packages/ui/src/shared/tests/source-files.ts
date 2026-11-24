import { readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";

const SKIPPED = /(^|\/)(node_modules|\.next|tests?|e2e)(\/|$)|\.test\./;

const files = (folder: string, sources: RegExp): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED.test(entry.name) ? [] : files(path, sources);
    }
    return sources.test(entry.name) && !SKIPPED.test(path) ? [path] : [];
  });

const appSources = (sources: RegExp) =>
  readdirSync(REPO.APPS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .flatMap((entry) => {
      try {
        return files(join(REPO.APPS, entry.name, "src"), sources);
      } catch {
        return [];
      }
    });

/** The source files (matching `sources`) of every App and of ui, tests and e2e left out: what a rule about "an App or ui" reads. */
export const appAndUiSources = (sources: RegExp) => [
  ...appSources(sources),
  ...files(join(REPO.PACKAGES, "ui", "src"), sources),
];
