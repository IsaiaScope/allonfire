// @module-tag unit
import { versionOf } from "../utils/version-of";

describe("versionOf", () => {
  it("is stable for the same parts", () => {
    expect(versionOf("2026-11-02T10:00:00.000Z", "laura:ADMIN")).toBe(
      versionOf("2026-11-02T10:00:00.000Z", "laura:ADMIN")
    );
  });

  it("differs when a part changes", () => {
    expect(versionOf("a", "b")).not.toBe(versionOf("a", "c"));
  });

  it("differs when parts are split differently", () => {
    expect(versionOf("ab", "c")).not.toBe(versionOf("a", "bc"));
  });

  it("differs when a part is dropped", () => {
    expect(versionOf("a", "b")).not.toBe(versionOf("a"));
  });
});
