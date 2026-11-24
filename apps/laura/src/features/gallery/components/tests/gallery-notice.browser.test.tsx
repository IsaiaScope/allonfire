// @module-tag integration

import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import { page } from "vitest/browser";
import { MASCOT } from "@/shared/constants/mascots";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { GALLERY } from "../../constants/gallery";
import { GalleryNotice } from "../gallery-notice";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const onRetry = vi.fn();
const picture = () =>
  document.querySelector("[data-testid=picture]")?.getAttribute("data-src");

beforeEach(() => onRetry.mockClear());

describe("GalleryNotice", () => {
  it.each([
    ["the Gallery", GALLERY.SOURCE.GALLERY, MASCOT.GALLERY.EMPTY, "Gallery"],
    [
      "the Favorites",
      GALLERY.SOURCE.FAVORITES,
      MASCOT.GALLERY.FAVORITES_EMPTY,
      "Favorites",
    ],
  ] as const)(
    "says %s has no photos yet, with its own picture of the sea, headed by an h2",
    async (_name, source, art, words) => {
      await renderInApp({
        children: (
          <GalleryNotice
            canMark={false}
            kind="empty"
            onRetry={onRetry}
            source={source}
          />
        ),
      });
      await expect
        .element(
          page.getByRole("heading", {
            level: 2,
            name: enT(`${words}.empty.title`),
          })
        )
        .toBeVisible();
      await expect
        .element(page.getByText(enT(`${words}.empty.description`)))
        .toBeVisible();
      expect(picture()).toBe(svgDataUrl(OCEAN_ART[art].SVG));
    }
  );

  it("says the photos did not load, with the error's picture and a Retry", async () => {
    await renderInApp({
      children: (
        <GalleryNotice
          canMark={false}
          kind="error"
          onRetry={onRetry}
          source={GALLERY.SOURCE.GALLERY}
        />
      ),
    });
    await expect
      .element(page.getByRole("heading", { name: enT("Gallery.error.title") }))
      .toBeVisible();
    expect(picture()).toBe(svgDataUrl(OCEAN_ART[MASCOT.ERROR].SVG));
    await page
      .getByRole("button", { name: enT("Gallery.error.retry") })
      .click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
