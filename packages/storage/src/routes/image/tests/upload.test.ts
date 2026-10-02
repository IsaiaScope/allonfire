// @module-tag unit
import { isImageUpload } from "../utils/upload";

describe("isImageUpload", () => {
  it("is the POST to the module's base path, nothing else", () => {
    expect(isImageUpload("POST", "/v1/images", "/v1/images")).toBe(true);
    expect(isImageUpload("PATCH", "/v1/images", "/v1/images")).toBe(false);
    expect(isImageUpload("POST", "/v1/images/x", "/v1/images")).toBe(false);
  });
});
