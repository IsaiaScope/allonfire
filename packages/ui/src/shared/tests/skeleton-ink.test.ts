// @module-tag unit
import { ink } from "../utils/skeleton-ink";

describe("ink", () => {
  it("pulses unless the visitor asks for less motion", () => {
    expect(ink({ tone: "faint" })).toContain("animate-pulse");
    expect(ink({ tone: "faint" })).toContain("motion-reduce:animate-none");
  });

  it.each([
    ["destructive", "bg-destructive/10"],
    ["faint", "bg-foreground/10"],
    ["primary", "bg-primary/30"],
  ] as const)("tints the %s tone with %s", (tone, tint) => {
    expect(ink({ tone })).toContain(tint);
  });
});
