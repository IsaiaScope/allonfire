import { describe, expect, it } from "vitest";
import { slugify, slugifyOrFallback } from "./slug";

const EMPTY_SLUG_RE = /empty slug/i;

describe("slugify", () => {
  it("lowercases and dash-separates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips italian accents", () => {
    expect(slugify("Perché così è")).toBe("perche-cosi-e");
    expect(slugify("È più bello")).toBe("e-piu-bello");
  });

  it("drops punctuation", () => {
    expect(slugify("FSM, spiegata bene!")).toBe("fsm-spiegata-bene");
  });

  it("collapses repeated dashes", () => {
    expect(slugify("a  --  b")).toBe("a-b");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("  --hello-- ")).toBe("hello");
  });

  it("throws on empty result", () => {
    expect(() => slugify("!!!")).toThrow(EMPTY_SLUG_RE);
    expect(() => slugify("")).toThrow(EMPTY_SLUG_RE);
  });

  it("falls back when a title has no slug-safe characters", () => {
    expect(slugifyOrFallback("🔥✨", "abc123XYZ_-")).toBe("abc123xyz");
  });
});
