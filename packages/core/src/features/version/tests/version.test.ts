// @module-tag unit
import { versionSchema } from "../constants/version";

describe("versionSchema", () => {
  it("refuses an empty version", () => {
    expect(versionSchema.safeParse("").success).toBe(false);
  });

  it("accepts a version", () => {
    expect(versionSchema.parse("abc")).toBe("abc");
  });
});
