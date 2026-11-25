// @module-tag unit
import { objectHas } from "../object";

describe("objectHas", () => {
  it("is true for a property the object holds itself", () => {
    expect(objectHas({ taken: "taken" }, "taken")).toBe(true);
    expect(objectHas({ 409: "taken" }, 409)).toBe(true);
  });

  it("is false for a property it only inherits, such as `constructor`", () => {
    expect(objectHas({}, "constructor")).toBe(false);
    expect(objectHas({}, "toString")).toBe(false);
    expect(objectHas({ taken: "taken" }, "__proto__")).toBe(false);
  });

  it("is false for a property it does not have", () => {
    expect(objectHas({ taken: "taken" }, "gone")).toBe(false);
  });
});
