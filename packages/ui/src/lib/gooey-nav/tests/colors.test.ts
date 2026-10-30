// @module-tag unit
import { contrastInk, parseColor } from "../colors";

describe("parseColor", () => {
  it("reads six- and three-digit hex, with or without #", () => {
    expect(parseColor("#ff0000")).toEqual([1, 0, 0, 1]);
    expect(parseColor("00ff00")).toEqual([0, 1, 0, 1]);
    expect(parseColor(" #00F ")).toEqual([0, 0, 1, 1]);
  });

  it("reads rgb() and rgba(), alpha 1 when left out", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual([1, 0, 0, 1]);
    expect(parseColor("rgba(0, 0, 255, 0.5)")).toEqual([0, 0, 1, 0.5]);
  });

  it("falls back to white for anything else", () => {
    expect(parseColor("tomato")).toEqual([1, 1, 1, 1]);
  });
});

describe("contrastInk", () => {
  it("is dark on a light pill and white on a dark one", () => {
    expect(contrastInk([1, 1, 1, 1])).toBe("#18161d");
    expect(contrastInk([0, 0, 0, 1])).toBe("#ffffff");
  });
});
