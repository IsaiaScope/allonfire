import { describe, expect, it } from "vitest";
import { detectPlatform } from "./platform";

const UNSUPPORTED_RE = /unsupported platform/i;

describe("detectPlatform", () => {
  it("maps darwin to macos", () => {
    expect(detectPlatform("darwin")).toBe("macos");
  });

  it("maps linux to linux", () => {
    expect(detectPlatform("linux")).toBe("linux");
  });

  it("maps win32 to windows", () => {
    expect(detectPlatform("win32")).toBe("windows");
  });

  it("throws on unsupported platform", () => {
    expect(() => detectPlatform("aix")).toThrow(UNSUPPORTED_RE);
  });
});
