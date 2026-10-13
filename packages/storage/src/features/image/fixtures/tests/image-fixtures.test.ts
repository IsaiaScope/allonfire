// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { prepareImage } from "../../prepare/prepare-image";
import { IMAGE_FIXTURE_FILES } from "../constants/files";

const fixtures = objectValues(FIXTURE.IMAGE);

// ponytail: width and height only; AVIF and WebP bytes differ between sharp
// builds (macOS arm64, CI x64), so `bytes` and `blurDataUrl` are not compared.
describe.each(fixtures)("Image Fixture $source", (fixture) => {
  it("is the size prepareImage makes of its source", async () => {
    const { height, width } = await prepareImage(
      readFileSync(resolve(IMAGE_FIXTURE_FILES, fixture.source))
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
