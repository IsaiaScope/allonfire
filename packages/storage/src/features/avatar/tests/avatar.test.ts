// @module-tag unit

import { IMAGE } from "../../image/constants/image";
import { AVATAR } from "../constants/avatar";

describe("AVATAR", () => {
  it("takes a picture as large as an Image's file", () => {
    expect(AVATAR.INPUT.BYTES).toBe(IMAGE.LIMIT.FILE_BYTES);
  });

  it("crops in the browser to a square larger than the one it stores", () => {
    expect(AVATAR.SIZE.CROP).toBeGreaterThan(AVATAR.SIZE.STORED);
  });
});
