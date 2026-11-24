// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofLogoSvg } from "../../brand/aof-logo";
import { JAPAN_IMAGE_COLOR } from "../../designs/japan/image-colors";
import { JAPAN_IMAGE_FONT } from "../../designs/japan/image-font";
import { OCEAN_IMAGE_COLOR } from "../../designs/ocean/image-colors";
import { OCEAN_IMAGE_FONT } from "../../designs/ocean/image-font";
import { BACK_OFFICE_LOGO } from "../back-office/back-office-logo";
import { LAURA_LOGO } from "../laura/laura-logo";

describe("the Apps' logos", () => {
  it("gives Laura the Ocean banner and face", () => {
    expect(LAURA_LOGO).toEqual({
      banner: OCEAN_IMAGE_COLOR.BANNER,
      fontFamily: OCEAN_IMAGE_FONT.FAMILY,
      name: "Laura",
    });
  });

  it("gives the Back Office the Japan green banner and face", () => {
    expect(BACK_OFFICE_LOGO).toEqual({
      banner: [
        "#1f6a42",
        JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP,
        JAPAN_IMAGE_COLOR.LINE.GREEN,
      ],
      fontFamily: JAPAN_IMAGE_FONT.FAMILY,
      name: "Back Office",
    });
  });

  it("draws each App's name on its logo, in capitals", () => {
    for (const app of [LAURA_LOGO, BACK_OFFICE_LOGO]) {
      expect(
        aofLogoSvg({
          app,
          layout: METADATA.LOGO.LAYOUT.SQUARE,
          scheme: METADATA.LOGO.SCHEME.AUTO,
        })
      ).toContain(app.name.toUpperCase());
    }
  });
});
