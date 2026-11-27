// @module-tag unit

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

/** Tracked and new files under `path` that are still on disk, without macOS's `._*` sidecars. */
const files = (path: string) =>
  execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", path],
    { cwd: REPO.ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(
      (file) =>
        file !== "" &&
        !file.includes("/._") &&
        existsSync(resolve(REPO.ROOT, file))
    );

const OLD_PACKAGES = ["packages/auth-old", "packages/ui-old"] as const;
const CONFIGS = [
  "pnpm-workspace.yaml",
  ".gitignore",
  ".jscpd.json",
  ".oxlintrc.json",
  "biome.jsonc",
  "vitest.config.ts",
  "knip.jsonc",
  "turbo.json",
  "tsconfig.json",
] as const;
const OLD_PATTERN = /(?:auth|ui)-old|\*-old/;
/** The pause: every config that once left Laura out. */
const PAUSE_CONFIGS = [
  "pnpm-workspace.yaml",
  "vitest.config.ts",
  ".oxlintrc.json",
  "biome.jsonc",
] as const;
/** Biome's restricted-import entries name `@allonfire/laura`, which stays. */
const LAURA_PATH = /apps\/laura/;
const GONE_PAGE = /games|quiz|settings/;
const ERRORS = "packages/core/src/features/errors";

describe("the old packages", () => {
  it.each(OLD_PACKAGES)("has no %s folder on disk", (path) => {
    expect(existsSync(resolve(REPO.ROOT, path))).toBe(false);
  });

  it.each(CONFIGS)(
    "%s names neither old package nor a *-old pattern",
    (path) => {
      expect(read(path)).not.toMatch(OLD_PATTERN);
    }
  );

  it.each(PAUSE_CONFIGS)("%s leaves no part of Laura out", (path) => {
    expect(read(path)).not.toMatch(LAURA_PATH);
  });
});

describe("the old Laura", () => {
  it("keeps one tracked public file, the favicon", () => {
    expect(files("apps/laura/public")).toEqual([
      "apps/laura/public/favicon.ico",
    ]);
  });

  it.each(["scripts", "messages", "src/lib", "src/components", "src/i18n"])(
    "has no apps/laura/%s",
    (folder) => {
      expect(existsSync(resolve(REPO.ROOT, "apps/laura", folder))).toBe(false);
    }
  );

  it("keeps no screenshot of a page that is gone", () => {
    expect(
      files("docs/screenshots").filter((path) => GONE_PAGE.test(path))
    ).toEqual([]);
  });

  it("has no root script that builds Laura without its build arguments", () => {
    expect(read("package.json")).not.toContain("docker:build:laura");
  });

  it("has no formatErrorMessage in core: its only reader was the old quiz admin", () => {
    expect(files(ERRORS)).not.toContain(`${ERRORS}/format-error-message.ts`);
    expect(read("packages/core/package.json")).not.toContain(
      "format-error-message"
    );
  });
});
