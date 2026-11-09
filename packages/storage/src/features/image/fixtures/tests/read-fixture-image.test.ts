// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { IMAGE_FIXTURE } from "../constants/files";
import { readFixtureImage } from "../utils/read-fixture-image";

describe("readFixtureImage", () => {
  it.each(objectValues(IMAGE_FIXTURE.FILE))("reads %s", (name) => {
    expect(readFixtureImage(name).byteLength).toBeGreaterThan(0);
  });
});
