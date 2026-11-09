// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

/** A tool a Stage runs, called by the hook itself. */
const BY_HAND = /docker:up|turbo run|knip|jscpd|dupes/;
const HOOK = readFileSync(resolve(REPO.ROOT, ".husky/pre-commit"), "utf8");
const commands = HOOK.split("\n").filter(
  (line) => line.trim() !== "" && !line.trim().startsWith("#")
);

describe("the pre-commit hook", () => {
  it("fixes the staged files, then runs every Stage as CI does", () => {
    expect(commands).toEqual([
      "pnpm exec lint-staged --allow-empty",
      "pnpm check",
    ]);
  });

  it("runs no tool by hand that a Stage already runs", () => {
    expect(HOOK).not.toMatch(BY_HAND);
  });
});
