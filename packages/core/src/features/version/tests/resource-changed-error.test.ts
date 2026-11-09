// @module-tag unit
import { CodedError } from "../../errors/coded-error";
import { ERROR } from "../../errors/constants/error-codes";
import { HTTP } from "../../http/constants/http";
import {
  checkVersion,
  ResourceChangedError,
} from "../utils/resource-changed-error";

describe("ResourceChangedError", () => {
  it("is the 409 RESOURCE_CHANGED every host's onError renders", () => {
    const error = new ResourceChangedError();
    expect(error).toBeInstanceOf(CodedError);
    expect(error.status).toBe(HTTP.STATUS.CONFLICT);
    expect(error.code).toBe(ERROR.CODE.RESOURCE_CHANGED);
  });

  it("names the resources that changed, when it knows them", () => {
    expect(new ResourceChangedError(["image-1"]).ids).toEqual(["image-1"]);
    expect(new ResourceChangedError().ids).toEqual([]);
  });
});

describe("checkVersion", () => {
  it("throws ResourceChangedError on a mismatch and returns on a match", () => {
    expect(() => checkVersion("version-1", "version-2")).toThrow(
      ResourceChangedError
    );
    expect(checkVersion("version-1", "version-1")).toBeUndefined();
  });
});
