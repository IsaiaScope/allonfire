// @module-tag unit
import { isDocsEnabled } from "../utils/enabled";

describe("isDocsEnabled", () => {
  it("is on in development regardless of the flag", () => {
    expect(isDocsEnabled("development", false)).toBe(true);
    expect(isDocsEnabled("test", false)).toBe(true);
  });

  it("is off in production unless explicitly enabled", () => {
    expect(isDocsEnabled("production", false)).toBe(false);
    expect(isDocsEnabled("production", true)).toBe(true);
  });
});
