// @module-tag integration
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { parseJsonWith } from "../../../shared/utils/json";
import { objectEntries } from "../../../shared/utils/object";
import { DEPLOY_UNIT } from "../constants/deploy-unit";
import { RELEASE } from "../constants/release";
import {
  alignVersions,
  applyRelease,
  readWorkspace,
} from "../release-workspace";
import { gitIn, initRepo, writeIn } from "./git-repo";

const manifest = (name: string) =>
  `{\n  "name": "${name}",\n  "version": "1.0.0",\n  "private": true\n}\n`;

/** Where each sample package lives. */
const FOLDER = {
  DATABASE: DEPLOY_UNIT.PATH.MIGRATION,
  SHARED: "packages/shared",
  SKIPPED: "packages/skipped",
  UI: "packages/ui",
  WEB: `${DEPLOY_UNIT.PATH.APPS}web`,
} as const;

const PACKAGES = {
  [FOLDER.DATABASE]: manifest("@sample/database"),
  [FOLDER.SHARED]: manifest("@sample/shared"),
  [FOLDER.SKIPPED]: manifest("@sample/skipped"),
  [FOLDER.UI]: manifest("@sample/ui"),
  [FOLDER.WEB]: manifest("@sample/web"),
};

const manifestOf = (folder: string) => `${folder}/${RELEASE.FILE.MANIFEST}`;
const sourceOf = (folder: string) => `${folder}/src/index.ts`;

/** A changed line of a diff, not its `---` and `+++` headers. */
const isChangedLine = (line: string) =>
  (line.startsWith("+") && !line.startsWith("+++")) ||
  (line.startsWith("-") && !line.startsWith("---"));

let root = "";

const git = (...args: string[]) => gitIn(root, ...args);

const write = (path: string, content: string) => writeIn(root, path, content);

const versionOf = (path: string) =>
  parseJsonWith(
    readFileSync(join(root, path), "utf8"),
    z.object({ version: z.string() })
  ).version;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "release-workspace-"));
  initRepo(root);
  write(
    RELEASE.FILE.WORKSPACE,
    `packages:\n  - "${DEPLOY_UNIT.PATH.APPS}*"\n  - "packages/*"\n  - "!${FOLDER.SKIPPED}"\n`
  );
  write(RELEASE.FILE.VERSION, "0.12.0\n");
  for (const [folder, content] of objectEntries(PACKAGES)) {
    write(manifestOf(folder), content);
    write(sourceOf(folder), "export {};\n");
  }
  git("add", "-A");
  git("commit", "-q", "-m", "chore(release): 0.12.0");
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("applyRelease", () => {
  it("bumps the changed library and the unit that redeploys, nothing else", () => {
    const from = git("rev-parse", "HEAD").trim();
    write(sourceOf(FOLDER.SHARED), "export const a = 1;\n");
    git("commit", "-q", "-am", "feat: shared");

    const changed = applyRelease({
      deployed: [FOLDER.WEB],
      from,
      next: "0.13.0",
      previous: "0.12.0",
      root,
    });

    expect(changed.sort((a, b) => a.localeCompare(b))).toEqual([
      manifestOf(FOLDER.WEB),
      manifestOf(FOLDER.SHARED),
    ]);
    expect(versionOf(manifestOf(FOLDER.WEB))).toBe("1.1.0");
    expect(versionOf(manifestOf(FOLDER.SHARED))).toBe("1.1.0");
    expect(versionOf(manifestOf(FOLDER.UI))).toBe("1.0.0");
    expect(versionOf(manifestOf(FOLDER.DATABASE))).toBe("1.0.0");
  });

  it("bumps each package by the Release's kind, from its own number", () => {
    const from = git("rev-parse", "HEAD").trim();
    write(sourceOf(FOLDER.UI), "export const b = 1;\n");
    git("commit", "-q", "-am", "fix: ui");

    applyRelease({
      deployed: [],
      from,
      next: "0.12.1",
      previous: "0.12.0",
      root,
    });

    expect(versionOf(manifestOf(FOLDER.UI))).toBe("1.0.1");
  });

  it("changes nothing when the range holds only a release commit", () => {
    const from = git("rev-parse", "HEAD").trim();
    write(RELEASE.FILE.VERSION, "0.13.0\n");
    write(
      RELEASE.FILE.MANIFEST,
      '{\n  "name": "root",\n  "version": "0.13.0"\n}\n'
    );
    git("add", "-A");
    git("commit", "-q", "-m", "chore(release): 0.13.0");

    expect(
      applyRelease({
        deployed: [],
        from,
        next: "0.13.0",
        previous: "0.12.0",
        root,
      })
    ).toEqual([]);
  });

  it("edits only the version line of each file", () => {
    const from = git("rev-parse", "HEAD").trim();
    write(sourceOf(FOLDER.UI), "export const c = 1;\n");
    git("commit", "-q", "-am", "feat: ui");

    applyRelease({
      deployed: [],
      from,
      next: "0.13.0",
      previous: "0.12.0",
      root,
    });

    const diff = git("diff", "-U0", "--", manifestOf(FOLDER.UI))
      .split("\n")
      .filter(isChangedLine);
    expect(diff).toEqual(['-  "version": "1.0.0",', '+  "version": "1.1.0",']);
  });

  it("counts every file when no Release came before", () => {
    applyRelease({
      deployed: [FOLDER.WEB],
      from: "",
      next: "0.13.0",
      previous: "0.12.0",
      root,
    });

    expect(versionOf(manifestOf(FOLDER.SHARED))).toBe("1.1.0");
    expect(versionOf(manifestOf(FOLDER.UI))).toBe("1.1.0");
    expect(versionOf(manifestOf(FOLDER.WEB))).toBe("1.1.0");
  });

  it("refuses a Release that moved nothing, and writes nothing", () => {
    const from = git("rev-parse", "HEAD").trim();
    write(sourceOf(FOLDER.UI), "export const d = 1;\n");
    git("commit", "-q", "-am", "feat: ui");

    expect(() =>
      applyRelease({
        deployed: [],
        from,
        next: "0.12.0",
        previous: "0.12.0",
        root,
      })
    ).toThrow();
    expect(versionOf(manifestOf(FOLDER.UI))).toBe("1.0.0");
  });
});

describe("applyRelease on a range that moved or renamed files", () => {
  const release = (from: string) =>
    applyRelease({
      deployed: [],
      from,
      next: "0.13.0",
      previous: "0.12.0",
      root,
    });

  it("bumps the package a file left, not only the one it went to", () => {
    const from = git("rev-parse", "HEAD").trim();
    git("mv", sourceOf(FOLDER.SHARED), `${FOLDER.UI}/src/moved.ts`);
    git("commit", "-q", "-m", "refactor: move");

    release(from);

    expect(versionOf(manifestOf(FOLDER.SHARED))).toBe("1.1.0");
    expect(versionOf(manifestOf(FOLDER.UI))).toBe("1.1.0");
  });

  it("counts a file whose name git would quote", () => {
    const from = git("rev-parse", "HEAD").trim();
    write(`${FOLDER.SHARED}/src/città.ts`, "export {};\n");
    git("add", "-A");
    git("commit", "-q", "-m", "feat: city");

    release(from);

    expect(versionOf(manifestOf(FOLDER.SHARED))).toBe("1.1.0");
  });
});

describe("readWorkspace", () => {
  const names = () => readWorkspace(root).map(({ name }) => name);

  it("skips a folder with no manifest: it is not a package", () => {
    write("packages/notes/README.txt", "notes\n");

    expect(names()).toHaveLength(4);
  });

  it("stops on a manifest it cannot read, naming it, and writes nothing", () => {
    write(manifestOf(FOLDER.SHARED), '{\n  "name": "@sample/shared"\n}\n');

    expect(() => alignVersions({ root, version: "0.12.0" })).toThrow(
      manifestOf(FOLDER.SHARED)
    );
    expect(versionOf(manifestOf(FOLDER.UI))).toBe("1.0.0");
  });

  it("stops when it reads no entry, as from a list written on one line", () => {
    write(RELEASE.FILE.WORKSPACE, 'packages: ["packages/*"]\n');

    expect(names).toThrow(RELEASE.FILE.WORKSPACE);
  });

  it("stops on a workspace entry it cannot expand", () => {
    write(RELEASE.FILE.WORKSPACE, 'packages:\n  - "packages/*"\n  - "tools"\n');

    expect(names).toThrow("tools");
  });

  it("reads only the packages list, not another list in the file", () => {
    write(
      RELEASE.FILE.WORKSPACE,
      'packages:\n  - "packages/*"\nonlyBuiltDependencies:\n  - esbuild\n'
    );

    expect(names()).toHaveLength(4);
  });
});

describe("alignVersions", () => {
  it("refuses a version that is not three numbers, and writes nothing", () => {
    expect(() => alignVersions({ root, version: "banana" })).toThrow("banana");
    expect(versionOf(manifestOf(FOLDER.SHARED))).toBe("1.0.0");
  });

  it("sets every workspace package, and not the ones the workspace excludes", () => {
    const changed = alignVersions({ root, version: "0.12.0" });

    expect(changed.sort((a, b) => a.localeCompare(b))).toEqual([
      manifestOf(FOLDER.WEB),
      manifestOf(FOLDER.DATABASE),
      manifestOf(FOLDER.SHARED),
      manifestOf(FOLDER.UI),
    ]);
    expect(versionOf(manifestOf(FOLDER.SKIPPED))).toBe("1.0.0");
    expect(versionOf(manifestOf(FOLDER.SHARED))).toBe("0.12.0");
  });
});
