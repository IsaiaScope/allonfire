// @module-tag integration
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { render } from "vitest-browser-react";
import { colorAlpha, computedValue } from "@/shared/tests/computed-style";
import { StationSign } from "../station-sign";

vi.mock("@allonfire/ui/components/aof-image", async () => ({
  AOFImage: (await import("@/shared/tests/image-mock")).ImageMock,
}));

const { DARK } = METADATA.COLOR_SCHEME;

/** The page's theme, as next-themes sets it on `<html>`. */
const setTheme = (night: boolean) =>
  document.documentElement.classList.toggle(DARK, night);

/** The sign's card, and its band: what holds the logo, the page's heading. */
const renderSign = async () => {
  const screen = await render(<StationSign seal={null}>body</StationSign>);
  // The mocked logo carries no name: the heading is the page's one h1.
  const band = screen
    .getByRole("heading", { level: 1 })
    .element().parentElement;
  const card = band?.parentElement;
  if (!(band && card)) {
    throw new Error("the sign has no band in its card");
  }
  return { band, card };
};

afterEach(() => setTheme(false));

describe("StationSign", () => {
  it.each([false, true])(
    "keeps the band at night in either theme (night page: %s)",
    async (night) => {
      setTheme(true);
      const nightText = computedValue("color", "var(--foreground)");
      setTheme(false);
      expect(computedValue("color", "var(--foreground)")).not.toBe(nightText);
      setTheme(night);
      const { band } = await renderSign();
      expect(getComputedStyle(band).color).toBe(nightText);
    }
  );

  it("lets what is painted behind show through band and body", async () => {
    const { band, card } = await renderSign();
    for (const part of [band, card]) {
      const alpha = colorAlpha(getComputedStyle(part).backgroundColor);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);
    }
  });
});
