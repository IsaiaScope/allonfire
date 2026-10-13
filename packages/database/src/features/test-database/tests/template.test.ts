// @module-tag unit
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { TEMPLATE_SOURCES, templateFingerprint } from "../template";

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** A throwaway tree with one source folder holding `files`. */
const treeWith = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "fingerprint-"));
  for (const [path, content] of objectEntries(files)) {
    mkdirSync(join(root, "src", path, ".."), { recursive: true });
    writeFileSync(join(root, "src", path), content);
  }
  return root;
};

it("fingerprints the same tree the same way", () => {
  expect(templateFingerprint()).toBe(templateFingerprint());
  expect(templateFingerprint()).toMatch(SHA256_HEX);
});

it("changes when a source file changes", () => {
  const before = templateFingerprint(treeWith({ "a.sql": "one" }), ["src"]);
  const after = templateFingerprint(treeWith({ "a.sql": "two" }), ["src"]);
  expect(after).not.toBe(before);
});

it("ignores dotfiles and tests, which build nothing", () => {
  const plain = templateFingerprint(treeWith({ "a.sql": "one" }), ["src"]);
  const noisy = templateFingerprint(
    treeWith({
      "._a.sql": "exfat",
      ".DS_Store": "finder",
      "a.sql": "one",
      "tests/a.test.ts": "a test",
    }),
    ["src"]
  );
  expect(noisy).toBe(plain);
});

it("builds from the changelog, the Fixtures and the db-migrate image", () => {
  expect(TEMPLATE_SOURCES).toEqual([
    "changelog",
    "liquibase",
    "src/features/seed",
  ]);
});
