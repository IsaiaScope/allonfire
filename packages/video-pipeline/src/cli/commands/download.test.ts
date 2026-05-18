import { describe, expect, it } from "vitest";
import { projectTitleForDownload } from "./download-view-model";

describe("projectTitleForDownload", () => {
  it("uses the source title when no override is provided", () => {
    expect(projectTitleForDownload(undefined, "Real Video Title")).toBe(
      "Real Video Title"
    );
  });

  it("uses a trimmed explicit title when provided", () => {
    expect(
      projectTitleForDownload("  Custom Title  ", "Real Video Title")
    ).toBe("Custom Title");
  });
});
