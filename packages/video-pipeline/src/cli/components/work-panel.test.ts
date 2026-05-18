import { describe, expect, it } from "vitest";
import { clampLines } from "./responsive";
import { workPanelContentWidth } from "./work-panel";

describe("work panel helpers", () => {
  it("reserves border and padding space before measuring text", () => {
    expect(workPanelContentWidth(64)).toBe(60);
  });

  it("allows current status text to wrap across several readable lines", () => {
    const text =
      "current: captions · Fetch optional English captions when YouTube provides them";
    const wrapped = clampLines(text, workPanelContentWidth(64), 4);

    expect(wrapped).toBe(
      "current: captions · Fetch optional English captions when\nYouTube provides them"
    );
    expect(wrapped).not.toContain("...");
  });
});
