import { describe, expect, it } from "vitest";
import { clampLines, ellipsize } from "./responsive";

describe("responsive text helpers", () => {
  it("ellipsizes text to a fixed terminal width", () => {
    expect(ellipsize("abcdef", 6)).toBe("abcdef");
    expect(ellipsize("abcdef", 5)).toBe("ab...");
    expect(ellipsize("abcdef", 2)).toBe("..");
  });

  it("clamps text to two lines by default", () => {
    expect(clampLines("one two three four five six", 9)).toBe(
      "one two\nthree..."
    );
  });

  it("clamps long words without overflowing", () => {
    expect(clampLines("supercalifragilistic", 8)).toBe("super...");
  });

  it("ellipsizes without splitting emoji graphemes", () => {
    expect(ellipsize("🔥🔥🔥", 5)).toBe("🔥...");
  });

  it("uses display width when clamping emoji text", () => {
    expect(clampLines("go 🔥🔥🔥 now", 6)).toBe("go\n🔥...");
  });
});
