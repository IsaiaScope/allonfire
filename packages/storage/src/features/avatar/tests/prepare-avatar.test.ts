// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import sharp from "sharp";
import { IMAGE } from "../../image/constants/image";
import { IMAGE_FIXTURE_FILES } from "../../image/fixtures/constants/files";
import { asImageError } from "../../image/hono/utils/errors";
import { AVATAR } from "../constants/avatar";
import { prepareAvatar } from "../prepare-avatar";

const BLUR_DATA_URL = /^data:image\/webp;base64,/;
/** An Avatar is square, so its blur is too, at an Image blur's width. */
const BLUR_SIDE = 16;

const file = (name: string) => readFileSync(resolve(IMAGE_FIXTURE_FILES, name));

const refusal = (input: Buffer) =>
  prepareAvatar(input).then(
    () => null,
    (error: unknown) => {
      try {
        return asImageError(error);
      } catch (coded) {
        return coded;
      }
    }
  );

describe("prepareAvatar", () => {
  it.each(["photo.jpg", "colors-no-alpha.heic"])(
    "makes a %s into a 256x256 AVIF",
    async (name) => {
      const { buffer } = await prepareAvatar(file(name));
      const { format, height, width } = await sharp(buffer).metadata();
      expect({ format, height, width }).toEqual({
        format: "heif",
        height: AVATAR.SIZE,
        width: AVATAR.SIZE,
      });
    }
  );

  it("comes with its blur, a tiny WebP as a data URL, as an Image's does", async () => {
    const { blurDataUrl } = await prepareAvatar(file("photo.jpg"));
    expect(blurDataUrl).toMatch(BLUR_DATA_URL);
    const blur = Buffer.from(blurDataUrl.replace(BLUR_DATA_URL, ""), "base64");
    expect(await sharp(blur).metadata()).toMatchObject({
      format: "webp",
      height: BLUR_SIDE,
      width: BLUR_SIDE,
    });
  });

  it.each([
    ["an animated GIF", file("animation.gif")],
    ["text", Buffer.from("not a picture")],
  ])("refuses %s as UNSUPPORTED_IMAGE (415)", async (_, input) => {
    const error = await refusal(input);
    expect(error).toBeInstanceOf(CodedError);
    expect(error).toMatchObject({
      code: IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
      status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    });
  });
});
