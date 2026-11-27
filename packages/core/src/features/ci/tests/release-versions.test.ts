// @module-tag unit
import { DEPLOY_UNIT } from "../constants/deploy-unit";
import { RELEASE } from "../constants/release";
import {
  bumpVersion,
  changedPackages,
  releaseKind,
  setVersion,
  type WorkspacePackage,
} from "../release-versions";

const PACKAGE_JSON = `{
  "name": "@allonfire/sample",
  "version": "1.0.0",
  "dependencies": {
    "zod": "4.0.0"
  }
}
`;

const pkg = (path: string): WorkspacePackage => ({
  name: `@allonfire/${path.split("/")[1]}`,
  path,
  version: "0.12.0",
});

/** Where each sample package lives. */
const FOLDER = {
  API: `${DEPLOY_UNIT.PATH.APPS}api`,
  CONFIG: "packages/config",
  CORE: "packages/core",
  DESIGN: "packages/design",
  LAURA: `${DEPLOY_UNIT.PATH.APPS}laura`,
  UI: "packages/ui",
} as const;

/** Files outside any package's sources. */
const FILE = {
  GUIDE: `docs/guides/laura${RELEASE.FILE.MARKDOWN_EXTENSION}`,
  README: `${FOLDER.CORE}/README${RELEASE.FILE.MARKDOWN_EXTENSION}`,
} as const;

const source = (folder: string, file: string) => `${folder}/src/${file}`;

const CONFIG = pkg(FOLDER.CONFIG);
const CORE = pkg(FOLDER.CORE);
const UI = pkg(FOLDER.UI);
const DESIGN = pkg(FOLDER.DESIGN);
const LAURA = pkg(FOLDER.LAURA);
const API = pkg(FOLDER.API);
const PACKAGES = [CONFIG, CORE, UI, DESIGN, LAURA, API];

const namesOf = (changed: WorkspacePackage[]) =>
  changed.map(({ name }) => name).sort((a, b) => a.localeCompare(b));

describe("bumpVersion", () => {
  it.each([
    ["0.12.0", "minor", "0.13.0"],
    ["0.12.3", "patch", "0.12.4"],
    ["1.2.3", "major", "2.0.0"],
    ["0.12.3", "minor", "0.13.0"],
  ] as const)("%s by %s is %s", (current, kind, next) => {
    expect(bumpVersion(current, kind)).toBe(next);
  });

  it("rejects a version that is not three numbers", () => {
    expect(() => bumpVersion("1.0", "patch")).toThrow();
  });
});

describe("releaseKind", () => {
  it.each([
    ["0.12.0", "0.13.0", "minor"],
    ["0.12.0", "0.12.1", "patch"],
    ["0.12.0", "1.0.0", "major"],
  ] as const)("%s to %s is %s", (previous, next, kind) => {
    expect(releaseKind(previous, next)).toBe(kind);
  });

  it("throws when nothing moved", () => {
    expect(() => releaseKind("0.12.0", "0.12.0")).toThrow();
  });
});

describe("setVersion", () => {
  it("replaces only the top-level version line", () => {
    expect(setVersion(PACKAGE_JSON, "0.12.0")).toBe(
      PACKAGE_JSON.replace('"version": "1.0.0"', '"version": "0.12.0"')
    );
  });

  it("leaves a nested version alone", () => {
    const nested = `{\n  "name": "x",\n  "version": "1.0.0",\n  "engines": {\n    "version": "9.9.9"\n  }\n}\n`;
    expect(setVersion(nested, "2.0.0")).toContain('"version": "9.9.9"');
  });

  it("throws on a file with no version", () => {
    expect(() => setVersion('{\n  "name": "x"\n}\n', "1.0.0")).toThrow();
  });
});

describe("changedPackages", () => {
  it("marks a library by its own files only", () => {
    expect(
      namesOf(
        changedPackages(PACKAGES, [source(FOLDER.DESIGN, "theme.css")], [])
      )
    ).toEqual(["@allonfire/design"]);
  });

  it("leaves a library alone when only its dependency changed", () => {
    expect(
      namesOf(changedPackages(PACKAGES, [source(FOLDER.CORE, "a.ts")], []))
    ).toEqual(["@allonfire/core"]);
  });

  it("marks the Deploy units that redeploy, whatever files changed", () => {
    expect(
      namesOf(
        changedPackages(
          PACKAGES,
          [RELEASE.FILE.LOCKFILE],
          [FOLDER.API, FOLDER.LAURA]
        )
      )
    ).toEqual(["@allonfire/api", "@allonfire/laura"]);
  });

  it("leaves a Deploy unit that does not redeploy, though its files changed", () => {
    expect(
      changedPackages(PACKAGES, [source(FOLDER.API, "notes.txt")], [])
    ).toEqual([]);
  });

  it("ignores root files and Markdown for a library", () => {
    expect(
      changedPackages(
        PACKAGES,
        [RELEASE.FILE.VERSION, RELEASE.FILE.MANIFEST, FILE.GUIDE, FILE.README],
        []
      )
    ).toEqual([]);
  });

  it("returns a package once", () => {
    const changed = changedPackages(
      PACKAGES,
      [source(FOLDER.UI, "a.tsx"), source(FOLDER.UI, "b.tsx")],
      [FOLDER.LAURA]
    );
    expect(changed).toHaveLength(2);
  });
});
