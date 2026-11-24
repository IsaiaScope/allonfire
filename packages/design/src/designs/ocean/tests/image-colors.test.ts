// @module-tag unit
import { readTheme } from "../../shared/tests/theme-css";
import { OCEAN_IMAGE_COLOR } from "../image-colors";

const THEME = readTheme("ocean");

/** Every value of a token in theme.css order: `:root` first, `.dark` second. */
const tokenValues = (token: string) =>
  [...THEME.matchAll(new RegExp(`--${token}: (#[0-9a-f]{6});`, "g"))].map(
    ([, value]) => value
  );

describe("OCEAN_IMAGE_COLOR", () => {
  it.each([
    ["background", "background"],
    ["foreground", "foreground"],
    ["muted-foreground", "mutedForeground"],
    ["primary", "primary"],
    ["card", "card"],
    ["coral", "coral"],
  ] as const)("matches --%s in both themes", (token, key) => {
    expect([OCEAN_IMAGE_COLOR.light[key], OCEAN_IMAGE_COLOR.dark[key]]).toEqual(
      tokenValues(token)
    );
  });

  it("matches --ink, the same by day and night", () => {
    expect([OCEAN_IMAGE_COLOR.INK]).toEqual(tokenValues("ink"));
  });
});
