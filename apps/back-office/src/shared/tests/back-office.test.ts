// @module-tag unit
import { BACK_OFFICE } from "@/shared/constants/back-office";
import pkg from "../../../package.json" with { type: "json" };

describe("BACK_OFFICE", () => {
  it("shows its own package's version, the one a Release moves", () => {
    expect(BACK_OFFICE.version).toBe(pkg.version);
  });
});
