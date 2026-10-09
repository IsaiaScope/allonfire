// @module-tag unit
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { syncDesigns, wornDesigns } from "../sync-core";

const APPS = "packages/design/src/apps";
const DESIGNS = "packages/design/src/designs";
const header = (name: string) =>
  `<!-- Generated from src/designs/${name}/DESIGN.md by design:sync. Edit through /aof-design. -->\n`;

let root = "";

const write = (path: string, content: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};
const read = (path: string) => readFileSync(join(root, path), "utf8");
const exists = (path: string) => existsSync(join(root, path));

const design = (name: string, json: string | null = '{"ramp":1}\n') => {
  write(`${DESIGNS}/${name}/DESIGN.md`, `# ${name}\n`);
  write(`${DESIGNS}/${name}/theme.css`, ":root {}\n");
  if (json !== null) {
    write(`${DESIGNS}/${name}/DESIGN.json`, json);
  }
};
const wear = (app: string, name: string) =>
  write(
    `${APPS}/${app}/styles.css`,
    `@import "@allonfire/ui/styles/base.css";\n@import "../../designs/${name}/theme.css";\n@source "./prototypes";\n`
  );

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "design-sync-"));
});
afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("wornDesigns", () => {
  it("maps an App to the Design its styles.css imports", () => {
    design("japan");
    wear("back-office", "japan");
    expect(wornDesigns(root)).toEqual(new Map([["back-office", "japan"]]));
  });

  it("skips an App with no Design import or no styles.css", () => {
    design("japan");
    write(
      `${APPS}/plain/styles.css`,
      '@import "@allonfire/ui/styles/base.css";\n'
    );
    mkdirSync(join(root, APPS, "half-made"), { recursive: true });
    expect(wornDesigns(root).size).toBe(0);
  });

  it("throws on an unknown Design, naming App and Design", () => {
    wear("back-office", "kyoto");
    expect(() => wornDesigns(root)).toThrow(
      'App "back-office" imports unknown Design "kyoto"'
    );
  });
});

describe("syncDesigns", () => {
  it("writes the header plus DESIGN.md and copies DESIGN.json", () => {
    design("japan");
    wear("back-office", "japan");
    const { changed } = syncDesigns(root);
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe(
      `${header("japan")}# japan\n`
    );
    expect(read(`${APPS}/back-office/DESIGN.json`)).toBe('{"ramp":1}\n');
    expect(changed).toEqual([
      `${APPS}/back-office/DESIGN.md`,
      `${APPS}/back-office/DESIGN.json`,
    ]);
  });

  it("removes the App's DESIGN.json when the Design has none", () => {
    design("japan", null);
    wear("back-office", "japan");
    write(`${APPS}/back-office/DESIGN.json`, "{}\n");
    syncDesigns(root);
    expect(exists(`${APPS}/back-office/DESIGN.json`)).toBe(false);
  });

  it("--check writes nothing and lists stale, missing and superfluous copies", () => {
    design("japan", null);
    wear("back-office", "japan");
    write(`${APPS}/back-office/DESIGN.md`, "stale\n");
    write(`${APPS}/back-office/DESIGN.json`, "{}\n");
    wear("laura", "japan");
    const { changed } = syncDesigns(root, { check: true });
    expect(changed).toEqual([
      `${APPS}/back-office/DESIGN.md`,
      `${APPS}/back-office/DESIGN.json`,
      `${APPS}/laura/DESIGN.md`,
    ]);
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe("stale\n");
    expect(exists(`${APPS}/laura/DESIGN.md`)).toBe(false);
  });

  it("--check reports nothing once in sync", () => {
    design("japan");
    wear("back-office", "japan");
    syncDesigns(root);
    expect(syncDesigns(root, { check: true }).changed).toEqual([]);
  });

  it("--from strips the header and fans out to every App wearing the Design", () => {
    design("japan");
    wear("back-office", "japan");
    wear("laura", "japan");
    syncDesigns(root);
    write(`${APPS}/back-office/DESIGN.md`, `${header("japan")}# japan v2\n`);
    write(`${APPS}/back-office/DESIGN.json`, '{"ramp":2}\n');
    syncDesigns(root, { from: "back-office" });
    expect(read(`${DESIGNS}/japan/DESIGN.md`)).toBe("# japan v2\n");
    expect(read(`${DESIGNS}/japan/DESIGN.json`)).toBe('{"ramp":2}\n');
    expect(read(`${APPS}/laura/DESIGN.md`)).toBe(
      `${header("japan")}# japan v2\n`
    );
    expect(read(`${APPS}/laura/DESIGN.json`)).toBe('{"ramp":2}\n');
  });

  it("--from copies back a DESIGN.md impeccable rewrote without the header", () => {
    design("japan");
    wear("back-office", "japan");
    write(`${APPS}/back-office/DESIGN.md`, "# rewritten\n");
    syncDesigns(root, { from: "back-office" });
    expect(read(`${DESIGNS}/japan/DESIGN.md`)).toBe("# rewritten\n");
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe(
      `${header("japan")}# rewritten\n`
    );
  });

  it("--from refuses an App that wears no Design or does not exist", () => {
    design("japan");
    write(`${APPS}/plain/styles.css`, "\n");
    expect(() => syncDesigns(root, { from: "plain" })).toThrow('App "plain"');
    expect(() => syncDesigns(root, { from: "ghost" })).toThrow('App "ghost"');
    expect(exists(`${APPS}/ghost`)).toBe(false);
  });

  it("refuses --check and --from together", () => {
    design("japan");
    wear("back-office", "japan");
    expect(() =>
      syncDesigns(root, { check: true, from: "back-office" })
    ).toThrow("--check and --from cannot run together");
  });

  it.each([
    "PRODUCT.md",
    "design.md",
    "docs/DESIGN.md",
    ".agents/context/PRODUCT.md",
    "packages/design/DESIGN.md",
    "packages/design/docs/PRODUCT.md",
    "packages/design/.agents/context/DESIGN.md",
    "packages/design/.impeccable/design.json",
  ])("refuses to run while %s shadows the App context", (path) => {
    design("japan");
    wear("back-office", "japan");
    write(path, "x\n");
    expect(() => syncDesigns(root)).toThrow(path);
  });

  it("ignores exFAT ._ sidecars when guarding", () => {
    design("japan");
    wear("back-office", "japan");
    write("._PRODUCT.md", "x\n");
    write("docs/._DESIGN.md", "x\n");
    expect(() => syncDesigns(root)).not.toThrow();
  });
});

describe("DESIGN.md header", () => {
  it("puts the header after YAML frontmatter, which must stay on line 1", () => {
    design("japan");
    write(`${DESIGNS}/japan/DESIGN.md`, "---\nname: Japan\n---\n\n# Japan\n");
    wear("back-office", "japan");
    syncDesigns(root);
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe(
      `---\nname: Japan\n---\n${header("japan")}\n# Japan\n`
    );
  });

  it("--from strips a header placed after the frontmatter", () => {
    design("japan");
    write(`${DESIGNS}/japan/DESIGN.md`, "---\nname: Japan\n---\n\n# Japan\n");
    wear("back-office", "japan");
    syncDesigns(root);
    write(
      `${APPS}/back-office/DESIGN.md`,
      `---\nname: Japan v2\n---\n${header("japan")}\n# Japan\n`
    );
    syncDesigns(root, { from: "back-office" });
    expect(read(`${DESIGNS}/japan/DESIGN.md`)).toBe(
      "---\nname: Japan v2\n---\n\n# Japan\n"
    );
  });
});
