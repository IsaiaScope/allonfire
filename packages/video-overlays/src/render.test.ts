import { describe, expect, it } from "vitest";
import { projectFolderFromArgs } from "./render";

describe("render CLI args", () => {
  it("ignores pnpm argument separators", () => {
    expect(projectFolderFromArgs(["--", "/tmp/project"])).toBe("/tmp/project");
  });
});
