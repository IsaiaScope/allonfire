// @module-tag unit

import { GALLERY } from "../../constants/gallery";
import { tileSpan } from "../tile-span";

describe("tileSpan", () => {
  it("is as many rows as the height is long beside the width: a square spans the precision", () => {
    expect(tileSpan(800, 800)).toBe(GALLERY.GRID.PRECISION);
  });

  it("is shorter for a landscape photo and taller for a portrait one", () => {
    expect(tileSpan(800, 600)).toBe((GALLERY.GRID.PRECISION * 3) / 4);
    expect(tileSpan(600, 800)).toBe(
      Math.round((GALLERY.GRID.PRECISION * 4) / 3)
    );
  });

  it("is a whole number of rows", () => {
    expect(Number.isInteger(tileSpan(777, 1013))).toBe(true);
  });

  it("is never below one row, however wide the panorama", () => {
    expect(tileSpan(100_000, 1)).toBe(1);
  });
});
