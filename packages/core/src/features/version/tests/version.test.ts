// @module-tag unit
import { ERROR } from "../../errors/constants/error-codes";
import { HTTP } from "../../http/constants/http";
import { versionSchema } from "../constants/version";
import { resourceChanged } from "../utils/resource-changed";

describe("resourceChanged", () => {
  it("is a 409 with the standard code", () => {
    const error = resourceChanged();
    expect(error.status).toBe(HTTP.STATUS.CONFLICT);
    expect(error.code).toBe(ERROR.CODE.RESOURCE_CHANGED);
  });
});

describe("versionSchema", () => {
  it("refuses an empty version", () => {
    expect(versionSchema.safeParse("").success).toBe(false);
  });

  it("accepts a version", () => {
    expect(versionSchema.parse("abc")).toBe("abc");
  });
});
