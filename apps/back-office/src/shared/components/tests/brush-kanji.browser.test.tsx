// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BrushKanji, type BrushKanjiProps } from "../brush-kanji";

const KANJI = "入";
/** The Japan Design's brush face (`theme.css`, `--font-brush`). */
const BRUSH_FACE = /^"?Yuji Syuku"?,/;
/** The wall's size on a phone: the narrower of 76% of the screen's width
 *  and 48% of its height, so the tilted kanji stay whole on it. */
const WALL = { HEIGHT: 0.48, WIDTH: 0.76 } as const;
/** A button's kanji: 6rem (`text-8xl`). */
const BUTTON_REM = 6;

const paint = async (placement?: BrushKanjiProps["placement"]) => {
  const screen = await render(
    <BrushKanji kanji={KANJI} placement={placement} />
  );
  const { fontFamily, fontSize } = getComputedStyle(
    screen.getByText(KANJI).element()
  );
  await screen.unmount();
  return { fontFamily, fontSize };
};

const px = (length: string) => Number.parseFloat(length);

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.PHONE.WIDTH, SCREEN.VIEWPORT.PHONE.HEIGHT)
);

describe("BrushKanji", () => {
  it("paints with the brush face", async () => {
    expect((await paint()).fontFamily).toMatch(BRUSH_FACE);
  });

  it("paints huge on the wall by default and smaller in a button when asked", async () => {
    const wall = px((await paint()).fontSize);
    expect(wall).toBeCloseTo(
      Math.min(WALL.WIDTH * innerWidth, WALL.HEIGHT * innerHeight)
    );
    const rem = px(getComputedStyle(document.documentElement).fontSize);
    const button = px((await paint("button")).fontSize);
    expect(button).toBe(BUTTON_REM * rem);
    expect(button).toBeLessThan(wall);
  });
});
