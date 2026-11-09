// @module-tag unit
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import sharp from "sharp";
import { IMAGE } from "../../image/constants/image";
import { IMAGE_FIXTURE } from "../../image/fixtures/constants/files";
import { readFixtureImage } from "../../image/fixtures/utils/read-fixture-image";
import { UnsupportedImageError } from "../../image/prepare/prepare-image";
import { asImageError } from "../../image/utils/image-error";
import { AVATAR } from "../constants/avatar";
import { prepareAvatar } from "../prepare-avatar";

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
  it.each([IMAGE_FIXTURE.FILE.PHOTO, IMAGE_FIXTURE.FILE.HEIC])(
    "makes a %s into a 256x256 AVIF",
    async (name) => {
      const { buffer } = await prepareAvatar(readFixtureImage(name));
      const { format, height, width } = await sharp(buffer).metadata();
      expect({ format, height, width }).toEqual({
        format: "heif",
        height: AVATAR.SIZE,
        width: AVATAR.SIZE,
      });
    }
  );

  it("comes with its blur, a tiny WebP as a data URL, as an Image's does", async () => {
    const { blurDataUrl } = await prepareAvatar(
      readFixtureImage(IMAGE_FIXTURE.FILE.PHOTO)
    );
    expect(blurDataUrl.startsWith(IMAGE.BLUR.DATA_URL_PREFIX)).toBe(true);
    const blur = Buffer.from(
      blurDataUrl.slice(IMAGE.BLUR.DATA_URL_PREFIX.length),
      "base64"
    );
    expect(await sharp(blur).metadata()).toMatchObject({
      format: "webp",
      // An Avatar is square, so its blur is too, at an Image blur's width.
      height: IMAGE.BLUR.WIDTH,
      width: IMAGE.BLUR.WIDTH,
    });
  });

  it.each([
    ["an animated GIF", readFixtureImage(IMAGE_FIXTURE.FILE.GIF)],
    ["text", Buffer.from("not a picture")],
  ])("refuses %s as UNSUPPORTED_IMAGE (415)", async (_, input) => {
    const error = await refusal(input);
    expect(error).toBeInstanceOf(CodedError);
    expect(error).toMatchObject({
      code: IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
      status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    });
  });

  it("refuses a truncated JPEG as unsupported, never a server error", async () => {
    const photo = readFixtureImage(IMAGE_FIXTURE.FILE.PHOTO);
    const half = photo.subarray(0, Math.floor(photo.length / 2));
    await expect(prepareAvatar(half)).rejects.toBeInstanceOf(
      UnsupportedImageError
    );
  });
});
