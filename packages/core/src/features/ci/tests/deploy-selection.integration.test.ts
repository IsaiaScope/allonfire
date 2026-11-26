// @module-tag integration
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { z } from "zod";
import { UNIT } from "../../../shared/constants/units";
import { parseJsonWith } from "../../../shared/utils/json";
import { unitFolders } from "../affected";
import { DEPLOY_UNIT } from "../constants/deploy-unit";
import { RELEASE } from "../constants/release";
import { applyRelease, readWorkspace } from "../release-workspace";
import { affectedSince } from "../turbo-affected";
import { gitIn, initRepo } from "./git-repo";

const LAB = {
  API_GUIDE: "docs/guides/api.md",
  /** A dependency only the API lists, and the lines its lockfile entry takes. */
  API_ONLY_DEPENDENCY: { ENTRY_LINES: 3, KEY: "      ioredis:" },
  NPMRC: ".npmrc",
  /** Two real pnpm releases: Turbo refuses a version that is not one. */
  PNPM: ["pnpm@9.15.9", "pnpm@9.15.8"],
  /** Real Turbo takes a while on a cold cache. */
  TIMEOUT_MS: 120 * UNIT.MS_PER_SECOND,
  TURBO_CONFIG: "turbo.json",
} as const;

const manifestSchema = z.object({ packageManager: z.string() });

const API = `${DEPLOY_UNIT.PATH.APPS}api`;
const LAURA = `${DEPLOY_UNIT.PATH.APPS}laura`;
const BACK_OFFICE = `${DEPLOY_UNIT.PATH.APPS}back-office`;
const APPS = [API, BACK_OFFICE, LAURA];
const EVERY_UNIT = [DEPLOY_UNIT.PATH.MIGRATION, ...APPS];

let lab = "";
let base = "";

const git = (...args: string[]) => gitIn(lab, ...args);

/** The lab as `base` left it. */
const restore = () => {
  git("reset", "-q", "--hard", base);
  git("clean", "-q", "-fd");
};

const commit = (message: string) => {
  git("add", "-A");
  git("commit", "-q", "--no-verify", "--allow-empty", "-m", message);
};

const sorted = (units: string[]) =>
  [...units].sort((a, b) => a.localeCompare(b));

/** Adds a line to a file of the lab, creating it. */
const touch = (path: string) => {
  mkdirSync(dirname(join(lab, path)), { recursive: true });
  appendFileSync(join(lab, path), "\nexport const lab = 1;\n");
};

/** The units that redeploy for what changed since `ref`. */
const redeployedSince = (ref: string) =>
  sorted(unitFolders(affectedSince(lab, ref)));

/** The units that redeploy once this one file has changed. */
const redeployedBy = (path: string) => {
  restore();
  touch(path);
  commit("change");
  return redeployedSince(base);
};

/**
 * Copies what Turbo reads to pick the affected packages: the root's and each
 * package's manifest and Turbo config, and the lockfile. A clone of the whole
 * repository timed out the tests running beside this one.
 */
const copyWorkspaceShape = () => {
  const folders = ["", ...readWorkspace(REPO.ROOT).map(({ path }) => path)];
  const files = [
    RELEASE.FILE.LOCKFILE,
    RELEASE.FILE.WORKSPACE,
    ...folders.flatMap((folder) =>
      [RELEASE.FILE.MANIFEST, LAB.TURBO_CONFIG].map((name) =>
        join(folder, name)
      )
    ),
  ];
  for (const file of files) {
    if (existsSync(join(REPO.ROOT, file))) {
      mkdirSync(dirname(join(lab, file)), { recursive: true });
      copyFileSync(join(REPO.ROOT, file), join(lab, file));
    }
  }
};

beforeAll(() => {
  lab = mkdtempSync(join(tmpdir(), "deploy-selection-"));
  initRepo(lab);
  copyWorkspaceShape();
  commit("base");
  base = git("rev-parse", "HEAD");
}, LAB.TIMEOUT_MS);

afterAll(() => {
  rmSync(lab, { force: true, recursive: true });
});

/** Drops the API's own entry for that dependency from the lockfile. */
const dropFromLockfile = () => {
  const file = join(lab, RELEASE.FILE.LOCKFILE);
  const lines = readFileSync(file, "utf8").split("\n");
  const importer = lines.indexOf(`  ${API}:`);
  const entry = lines.indexOf(LAB.API_ONLY_DEPENDENCY.KEY, importer);
  if (importer < 0 || entry < 0) {
    throw new Error("the lockfile no longer lists the API's dependency");
  }
  lines.splice(entry, LAB.API_ONLY_DEPENDENCY.ENTRY_LINES);
  writeFileSync(file, lines.join("\n"));
};

// A Release numbers a unit exactly when this says it redeploys.
describe("what a change redeploys", { timeout: LAB.TIMEOUT_MS }, () => {
  it.each(["packages/ui", "packages/design"])(
    "%s: the Apps, not the database migration",
    (folder) => {
      expect(redeployedBy(`${folder}/src/lab.ts`)).toEqual(sorted(APPS));
    }
  );

  it("core: every unit, the database reads it", () => {
    expect(redeployedBy("packages/core/src/lab.ts")).toEqual(
      sorted(EVERY_UNIT)
    );
  });

  it("a lockfile change: the units that read it, not the database", () => {
    restore();
    dropFromLockfile();
    commit("lockfile");

    // Laura and the Back Office list the API, so what it runs on reaches them.
    expect(redeployedSince(base)).toEqual(sorted(APPS));
  });

  it("the API's guide alone: nothing, though its tests read it", () => {
    expect(redeployedBy(LAB.API_GUIDE)).toEqual([]);
  });

  it("an .npmrc, read by every image's install: every unit", () => {
    expect(redeployedBy(LAB.NPMRC)).toEqual(sorted(EVERY_UNIT));
  });

  it("the pnpm every image installs with: every unit", () => {
    restore();
    const file = join(lab, RELEASE.FILE.MANIFEST);
    const manifest = readFileSync(file, "utf8");
    const { packageManager } = parseJsonWith(manifest, manifestSchema);
    const other = LAB.PNPM.find((pnpm) => pnpm !== packageManager) ?? "";
    writeFileSync(file, manifest.replace(packageManager, other));
    commit("pnpm");

    expect(redeployedSince(base)).toEqual(sorted(EVERY_UNIT));
  });

  // The Release commit edits each numbered manifest, which Turbo reads too: it
  // must not redeploy a unit that got no number.
  it("the units a Release numbers stay the ones that redeploy after it", () => {
    restore();
    for (const path of [LAB.API_GUIDE, `${LAURA}/src/lab.ts`]) {
      touch(path);
    }
    commit("change");
    const numbered = unitFolders(affectedSince(lab, base));

    applyRelease({
      deployed: numbered,
      from: base,
      next: "0.14.0",
      previous: "0.13.0",
      root: lab,
    });
    commit("release");

    expect(redeployedSince(base)).toEqual(sorted(numbered));
  });

  it("a Release's own root files: nothing", () => {
    restore();
    writeFileSync(join(lab, RELEASE.FILE.VERSION), "9.9.9\n");
    commit("release");

    expect(unitFolders(affectedSince(lab, base))).toEqual([]);
  });

  it("an uncommitted VERSION, as the release hook finds it: nothing", () => {
    restore();
    writeFileSync(join(lab, RELEASE.FILE.VERSION), "9.9.9\n");

    expect(unitFolders(affectedSince(lab, base))).toEqual([]);
  });

  it("an image file Turbo does not read: every unit", () => {
    expect(redeployedBy("docker/Dockerfile")).toEqual(sorted(EVERY_UNIT));
  });

  it("an image file whose name git would quote: every unit", () => {
    expect(redeployedBy("docker/città.sh")).toEqual(sorted(EVERY_UNIT));
  });

  it("a file moved out of the image folder: every unit", () => {
    restore();
    mkdirSync(join(lab, "docker"), { recursive: true });
    writeFileSync(join(lab, "docker/entry.sh"), "#!/bin/sh\n");
    commit("add");
    const added = git("rev-parse", "HEAD");
    mkdirSync(join(lab, "tools"), { recursive: true });
    git("mv", "docker/entry.sh", "tools/entry.sh");
    commit("move");

    expect(redeployedSince(added)).toEqual(sorted(EVERY_UNIT));
  });

  it("no Release or deploy yet: every unit", () => {
    expect(redeployedSince("")).toEqual(sorted(EVERY_UNIT));
  });
});
