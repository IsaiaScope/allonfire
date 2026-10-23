// @module-tag unit
import { boxDistance, cornerRadius, pillPath } from "../geometry";

const BOX = { cx: 50, cy: 10, hh: 10, hw: 50 };

describe("cornerRadius", () => {
  it("never passes half the shorter side, and is never negative", () => {
    expect(cornerRadius(50, 10, 4)).toBe(4);
    expect(cornerRadius(50, 10, Number.POSITIVE_INFINITY)).toBe(10);
    expect(cornerRadius(50, 10, -1)).toBe(0);
  });
});

describe("boxDistance", () => {
  it("is negative inside, zero on the edge, positive outside", () => {
    expect(boxDistance(BOX, [50, 10], 4)).toBeLessThan(0);
    expect(boxDistance(BOX, [100, 10], 4)).toBeCloseTo(0);
    expect(boxDistance(BOX, [120, 10], 4)).toBeCloseTo(20);
  });

  it("cuts the corner by the radius: a capsule cuts more than a rounded box", () => {
    const corner = [0.5, 0.5] as const;
    expect(boxDistance(BOX, corner, 0)).toBeLessThan(0);
    expect(boxDistance(BOX, corner, Number.POSITIVE_INFINITY)).toBeGreaterThan(
      0
    );
  });
});

describe("pillPath", () => {
  it("draws arcs of the given radius, capped at half the height", () => {
    const rect = { h: 20, w: 100, x: 0, y: 0 };
    expect(pillPath(rect, 4)).toContain("A4,4 0 0 1");
    expect(pillPath(rect, Number.POSITIVE_INFINITY)).toContain("A10,10 0 0 1");
  });

  it("draws nothing for a box too small to clip to", () => {
    expect(pillPath({ h: 0.2, w: 10, x: 0, y: 0 }, 4)).toBe("");
  });
});
