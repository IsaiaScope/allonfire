import { describe, expect, it } from "vitest";
import { sentenceCase } from "./header";

describe("sentenceCase", () => {
  it("capitalizes the first visible character", () => {
    expect(sentenceCase("force reinstall dependencies")).toBe(
      "Force reinstall dependencies"
    );
    expect(
      sentenceCase("runs installers even when tools are already present")
    ).toBe("Runs installers even when tools are already present");
  });

  it("preserves URLs and technical prefixes", () => {
    expect(sentenceCase("https://www.youtube.com/watch?v=7zxIeRWasbc")).toBe(
      "https://www.youtube.com/watch?v=7zxIeRWasbc"
    );
    expect(sentenceCase("--force")).toBe("--force");
    expect(sentenceCase("/Volumes/Crucial-4T/repo/allonfire")).toBe(
      "/Volumes/Crucial-4T/repo/allonfire"
    );
  });

  it("handles empty strings", () => {
    expect(sentenceCase("")).toBe("");
    expect(sentenceCase("   ")).toBe("");
  });
});
