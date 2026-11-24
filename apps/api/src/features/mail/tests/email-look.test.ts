// @module-tag unit
import { App } from "@allonfire/database/enums";
import { OCEAN_EMAIL_LOOK } from "@allonfire/design/designs/ocean/email-look";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import { EMAIL } from "../constants/email";

describe("EMAIL.LOOK", () => {
  it("dresses Laura's emails in Ocean, under Laura's name", () => {
    const look = EMAIL.LOOK[App.LAURA];
    expect(look.brand).toBe("Laura");
    expect(look.accent).toBe(OCEAN_EMAIL_LOOK.accent);
    expect(look.dark.ground).toBe(OCEAN_IMAGE_COLOR.dark.background);
  });

  it("keeps Japan's flourish on the Back Office's emails", () => {
    expect(EMAIL.LOOK[App.BACK_OFFICE].flourish.seal.text).toBeTruthy();
  });
});
