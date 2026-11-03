// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { prepareImage } from "../../prepare/prepare-image";
import { readFixtureImage } from "../utils/read-fixture-image";

const fixtures = objectValues(FIXTURE.IMAGE);

// ponytail: width and height only; AVIF and WebP bytes differ between sharp
// builds (macOS arm64, CI x64), so `bytes` and `blurDataUrl` are not compared.
describe.each(fixtures)("Image Fixture $source", (fixture) => {
  it("is the size prepareImage makes of its source", async () => {
    const { height, width } = await prepareImage(
      readFixtureImage(fixture.source)
    );
    expect({ height, width }).toEqual({
      height: fixture.height,
      width: fixture.width,
    });
  });
});

it("has a Fixture per accepted format", () => {
  const extensions = fixtures.map(({ source }) => source.split(".").pop());
  expect(new Set(extensions)).toEqual(
    new Set(["jpg", "png", "webp", "avif", "heic"])
  );
});
