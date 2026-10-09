import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const DESIGN_PACKAGE = "packages/design";
const APPS_DIR = `${DESIGN_PACKAGE}/src/apps`;
const DESIGNS_DIR = `${DESIGN_PACKAGE}/src/designs`;
const DESIGN_MD = "DESIGN.md";
const DESIGN_JSON = "DESIGN.json";
const DESIGN_IMPORT = /@import\s+"\.\.\/\.\.\/designs\/([^/"]+)\/theme\.css"/;
const CONTEXT_FILES = new Set(["product.md", "design.md"]);
// impeccable reads a PRODUCT.md or DESIGN.md found in any of these before it
// ever looks at IMPECCABLE_CONTEXT_DIR: the repo root and the package (its
// project root), each with its `docs/` and `.agents/context/` fallbacks.
const SHADOWING_DIRS = [
  ".",
  "docs",
  ".agents/context",
  DESIGN_PACKAGE,
  `${DESIGN_PACKAGE}/docs`,
  `${DESIGN_PACKAGE}/.agents/context`,
];
// impeccable prefers this sidecar over the App folder's DESIGN.json.
const PACKAGE_SIDECAR = `${DESIGN_PACKAGE}/.impeccable/design.json`;

export type SyncOptions = { check?: boolean; from?: string };
export type SyncResult = { changed: string[] };

const header = (design: string) =>
  `<!-- Generated from src/designs/${design}/DESIGN.md by design:sync. Edit through /aof-design. -->\n`;

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

// YAML frontmatter must stay on line 1 for DESIGN.md parsers, so the header
// goes right after it when the file has one.
const withHeader = (design: string, md: string) => {
  const frontmatter = md.match(FRONTMATTER)?.[0] ?? "";
  return frontmatter + header(design) + md.slice(frontmatter.length);
};

const withoutHeader = (design: string, md: string) =>
  md.replace(header(design), "");

const readIfExists = (path: string): string | null =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

const assertNoShadowingContext = (root: string) => {
  for (const dir of SHADOWING_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) {
      continue;
    }
    const hit = readdirSync(abs).find((name) =>
      CONTEXT_FILES.has(name.toLowerCase())
    );
    if (hit) {
      const path = dir === "." ? hit : `${dir}/${hit}`;
      throw new Error(
        `${path} shadows the App context impeccable reads; move it into ${APPS_DIR}/<app>/`
      );
    }
  }
  if (existsSync(join(root, PACKAGE_SIDECAR))) {
    throw new Error(
      `${PACKAGE_SIDECAR} overrides every App's DESIGN.json; move it into the App folder`
    );
  }
};

/** App folder name to the Design its styles.css imports. */
export const wornDesigns = (root: string): Map<string, string> => {
  const worn = new Map<string, string>();
  const appsDir = join(root, APPS_DIR);
  if (!existsSync(appsDir)) {
    return worn;
  }
  // Sorted: readdir order differs across filesystems, and `changed` is read
  // in order by CI output and tests.
  const entries = readdirSync(appsDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    const styles = readIfExists(join(appsDir, entry.name, "styles.css"));
    const design = styles?.match(DESIGN_IMPORT)?.[1];
    if (!design) {
      continue;
    }
    if (!existsSync(join(root, DESIGNS_DIR, design))) {
      throw new Error(
        `App "${entry.name}" imports unknown Design "${design}" in its styles.css`
      );
    }
    worn.set(entry.name, design);
  }
  return worn;
};

const expectedCopies = (root: string, app: string, design: string) => {
  const source = join(root, DESIGNS_DIR, design);
  const md = readIfExists(join(source, DESIGN_MD));
  return [
    [
      `${APPS_DIR}/${app}/${DESIGN_MD}`,
      md === null ? null : withHeader(design, md),
    ],
    [
      `${APPS_DIR}/${app}/${DESIGN_JSON}`,
      readIfExists(join(source, DESIGN_JSON)),
    ],
  ] as const;
};

const pullFrom = (root: string, app: string, design: string) => {
  const appDir = join(root, APPS_DIR, app);
  const source = join(root, DESIGNS_DIR, design);
  const md = readIfExists(join(appDir, DESIGN_MD));
  if (md !== null) {
    writeFileSync(join(source, DESIGN_MD), withoutHeader(design, md));
  }
  const json = readIfExists(join(appDir, DESIGN_JSON));
  if (json !== null) {
    writeFileSync(join(source, DESIGN_JSON), json);
  }
};

/**
 * Copies each Design's DESIGN.md (behind a generated header) and DESIGN.json
 * into every App folder wearing it. `from` first copies one App's edited
 * copies back to the Design; `check` writes nothing and reports the drift.
 */
export const syncDesigns = (
  root: string,
  options: SyncOptions = {}
): SyncResult => {
  if (options.check && options.from !== undefined) {
    throw new Error("--check and --from cannot run together");
  }
  assertNoShadowingContext(root);
  const worn = wornDesigns(root);
  if (options.from !== undefined) {
    const design = worn.get(options.from);
    if (!design) {
      throw new Error(
        `App "${options.from}" wears no Design: its ${APPS_DIR}/${options.from}/styles.css imports none`
      );
    }
    pullFrom(root, options.from, design);
  }
  const changed: string[] = [];
  for (const [app, design] of worn) {
    for (const [path, content] of expectedCopies(root, app, design)) {
      const abs = join(root, path);
      if (readIfExists(abs) === content) {
        continue;
      }
      changed.push(path);
      if (options.check) {
        continue;
      }
      if (content === null) {
        rmSync(abs);
      } else {
        writeFileSync(abs, content);
      }
    }
  }
  return { changed };
};
