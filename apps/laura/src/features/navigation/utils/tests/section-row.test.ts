// @module-tag unit
import { sectionRow } from "../section-row";

describe("sectionRow", () => {
  // The one class assertion allowed: the variants exist, what they say is the Design's.
  it("marks the Section you are on differently from the others", () => {
    expect(sectionRow({ current: true })).not.toBe(
      sectionRow({ current: false })
    );
  });
});
