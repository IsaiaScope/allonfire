// @module-tag unit
import { readFileSync } from "node:fs";
import { JAPAN_IMAGE_COLOR } from "../image-colors";

const THEME = readFileSync(new URL("../theme.css", import.meta.url), "utf8");

/** Every value of a token in theme.css order: `:root` first, `.dark` second. */
const tokenValues = (token: string) =>
  [...THEME.matchAll(new RegExp(`--${token}: (#[0-9a-f]{6});`, "g"))].map(
    ([, value]) => value
  );

describe("JAPAN_IMAGE_COLOR", () => {
  it.each([
    ["background", "background"],
    ["foreground", "foreground"],
    ["muted-foreground", "mutedForeground"],
    ["primary", "primary"],
  ] as const)("matches --%s in both themes", (token, key) => {
    expect([JAPAN_IMAGE_COLOR.light[key], JAPAN_IMAGE_COLOR.dark[key]]).toEqual(
      tokenValues(token)
    );
  });

  it.each([
    ["line-green", JAPAN_IMAGE_COLOR.LINE.GREEN],
    ["line-orange", JAPAN_IMAGE_COLOR.LINE.ORANGE],
    ["tactile", JAPAN_IMAGE_COLOR.TACTILE],
  ] as const)("matches --%s", (token, value) => {
    expect([value]).toEqual(tokenValues(token));
  });
});
