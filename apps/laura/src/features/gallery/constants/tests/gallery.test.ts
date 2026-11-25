// @module-tag unit
import { LAURA as API_LAURA } from "@allonfire/api/features/laura/constants/laura";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { GALLERY } from "../gallery";

const UNIT_KEY = /_(MS|PX)$/;

describe("GALLERY", () => {
  it("asks for no more photos in a page than the API serves", () => {
    expect(GALLERY.DEFAULT.PAGE_SIZE).toBeLessThanOrEqual(
      API_LAURA.GALLERY.LIMIT.MAX
    );
  });

  it("keeps every unit inside a group, never at the owner's top", () => {
    expect(objectKeys(GALLERY).filter((key) => UNIT_KEY.test(key))).toEqual([]);
  });

  it("names the two lists a feed shows", () => {
    expect(objectKeys(GALLERY.SOURCE)).toEqual(["FAVORITES", "GALLERY"]);
  });
});
