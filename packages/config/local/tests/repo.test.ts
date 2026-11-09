// @module-tag unit
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { REPO } from "../repo";

describe("REPO", () => {
  it("is the repository's root, the folder holding pnpm's workspace file", () => {
    expect(existsSync(resolve(REPO.ROOT, "pnpm-workspace.yaml"))).toBe(true);
  });

  it("holds the Apps and the packages folders", () => {
    expect(basename(REPO.APPS)).toBe("apps");
    expect(existsSync(resolve(REPO.APPS, "api"))).toBe(true);
    expect(basename(REPO.PACKAGES)).toBe("packages");
    expect(existsSync(resolve(REPO.PACKAGES, "config"))).toBe(true);
  });
});
