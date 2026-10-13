// @module-tag unit
import { STORAGE } from "../../../../shared/constants/paths";
import { isImageUpload } from "../utils/upload";

/** Where a host mounts the module: a prefix of its own, then `STORAGE.PATH.IMAGES`. */
const HOST_MOUNT_PATH = `/host-prefix${STORAGE.PATH.IMAGES}`;

describe("isImageUpload", () => {
  it("is the POST to the module's base path, nothing else", () => {
    expect(isImageUpload("POST", HOST_MOUNT_PATH, HOST_MOUNT_PATH)).toBe(true);
    expect(isImageUpload("PATCH", HOST_MOUNT_PATH, HOST_MOUNT_PATH)).toBe(
      false
    );
    expect(isImageUpload("POST", `${HOST_MOUNT_PATH}/x`, HOST_MOUNT_PATH)).toBe(
      false
    );
  });
});
