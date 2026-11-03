// @module-tag unit
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: plain string checks, no JSON parser: config imports nothing,
// core's helpers included.
/** The packages each of whose export keys needs a reader outside it. */
const PACKAGES = ["auth", "config", "database", "storage"] as const;
type Package = (typeof PACKAGES)[number];

/** Keys kept with no reader the scan sees, each with its reason. */
const KEPT = {
  auth: [],
  config: [],
  // Held only by Laura, which sits outside the workspace and still imports
  // it by an older path.
  database: ["./features/apps/laura/game-score.service"],
  storage: [],
} as const satisfies Record<Package, readonly string[]>;

/**
 * Where a reader can sit: every App and package (code, configs, scripts,
 * package.json scripts) and the root configs. The package's turbo `test`
 * inputs list the same.
 */
const SCANNED = [
  "apps",
  "packages",
  "package.json",
  "turbo.json",
  "knip.jsonc",
  "vitest.config.ts",
] as const;

const NAME = /"name": "([^"]+)"/;
const EXPORTS = /"exports": \{([^}]*)\}/;
const EXPORT_KEY = /^\s*"(\.[^"]*)":/gm;
/** A text file a reader can be written in. */
const READABLE = /\.(?:[cm]?[jt]sx?|jsonc?|ya?ml)$/;
/** macOS's `._*` sidecars on the exFAT drive, and documentation. */
const NOT_A_READER = /(?:^|\/)\._|\.md$/;
/** The specifier runs on: a longer key's, not this one's. */
const RUNS_ON = /^[\w./-]/;
/** A package.json dependency line, which names the package but reads nothing. */
const DEPENDENCY = /^": "workspace:/;

const THIS_FILE = relative(REPO, import.meta.filename);

/** Every file a reader can sit in, tracked or new, with its text. */
const readers = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...SCANNED],
  { cwd: REPO, encoding: "utf8" }
)
  .split("\n")
  .filter(
    (path) =>
      READABLE.test(path) &&
      !NOT_A_READER.test(path) &&
      path !== THIS_FILE &&
      existsSync(resolve(REPO, path))
  )
  .map((path) => ({ path, text: read(path) }));

/** Whether `text` reads the specifier, or any under it when `prefix`. */
const reads = (text: string, specifier: string, prefix: boolean) => {
  for (
    let at = text.indexOf(specifier);
    at !== -1;
    at = text.indexOf(specifier, at + 1)
  ) {
    const rest = text.slice(at + specifier.length);
    if ((prefix || !RUNS_ON.test(rest)) && !DEPENDENCY.test(rest)) {
      return true;
    }
  }
  return false;
};

/** `<name> <key>` for each export key nothing outside the package reads. */
const unreadKeys = (pkg: Package) => {
  const dir = `packages/${pkg}/`;
  const manifest = read(`${dir}package.json`);
  const name = manifest.match(NAME)?.[1];
  const block = manifest.match(EXPORTS)?.[1];
  if (name === undefined || block === undefined) {
    throw new Error(`${dir}package.json has no name or exports`);
  }
  const kept: readonly string[] = KEPT[pkg];
  const outside = readers.filter(({ path }) => !path.startsWith(dir));
  return [...block.matchAll(EXPORT_KEY)]
    .flatMap((match) => match[1] ?? [])
    .filter((key) => !kept.includes(key))
    .filter((key) => {
      const prefix = key.endsWith("*");
      const specifier =
        key === "." ? name : `${name}${key.slice(1).replace("*", "")}`;
      return !outside.some(({ text }) => reads(text, specifier, prefix));
    })
    .map((key) => `${name} ${key}`);
};

it("every export key of auth, storage, database and config is imported from outside its package", () => {
  expect(PACKAGES.flatMap(unreadKeys)).toEqual([]);
});

it("keeps only keys that are still exported", () => {
  for (const pkg of PACKAGES) {
    const manifest = read(`packages/${pkg}/package.json`);
    for (const key of KEPT[pkg]) {
      expect(manifest).toContain(`"${key}":`);
    }
  }
});
