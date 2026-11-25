// @module-tag unit
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGE } from "../image";

describe("IMAGE.UPLOAD", () => {
  it("names the five ways an add is refused", () => {
    expect(objectValues(IMAGE.UPLOAD.ERROR)).toEqual([
      "failed",
      "invalid",
      "refused",
      "tooLarge",
      "unsupported",
    ]);
  });

  it("tells each of the API's codes in its own words", () => {
    expect(IMAGE.UPLOAD.REFUSAL[STORED_IMAGE.ERROR_CODE.IMAGE_TOO_LARGE]).toBe(
      IMAGE.UPLOAD.ERROR.TOO_LARGE
    );
    expect(
      IMAGE.UPLOAD.REFUSAL[STORED_IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE]
    ).toBe(IMAGE.UPLOAD.ERROR.UNSUPPORTED);
    expect(IMAGE.UPLOAD.REFUSAL[ERROR.CODE.BAD_REQUEST]).toBe(
      IMAGE.UPLOAD.ERROR.INVALID
    );
  });

  it("tells every code with one of the errors", () => {
    for (const told of objectValues(IMAGE.UPLOAD.REFUSAL)) {
      expect(objectValues(IMAGE.UPLOAD.ERROR)).toContain(told);
    }
  });

  it("says one thing once an add is saved", () => {
    expect(IMAGE.UPLOAD.NOTICE).toEqual({ ADDED: "added" });
  });
});
