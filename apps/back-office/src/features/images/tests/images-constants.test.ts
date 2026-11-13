// @module-tag unit
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGES } from "../constants/images";

describe("IMAGES.UPLOAD_BODY_LIMIT", () => {
  it("is the API's upload cap plus 1 MiB", () => {
    expect(IMAGES.UPLOAD_BODY_LIMIT).toBe(
      IMAGE.LIMIT.UPLOAD_BYTES + UNIT.BYTES_PER_MIB
    );
  });
});
