// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { App } from "@allonfire/database/enums";
import { FORM_WIDTHS } from "@allonfire/ui/shared/tests/height-at";
import { page } from "vitest/browser";
import { heightAt } from "@/shared/tests/height-at";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { imageBody } from "../../tests/image-body";
import { replace } from "../../tests/image-form-mocks";
import { AddImage } from "../add-image";
import { AddImageSkeleton } from "../add-image-skeleton";
import { EditImage } from "../edit-image";
import { EditImageSkeleton } from "../edit-image-skeleton";

// jscpd:ignore-start
vi.mock("../../actions/add-image", () => ({ addImage: vi.fn() }));
vi.mock("../../actions/edit-image", () => ({ editImage: vi.fn() }));
vi.mock("../../actions/delete-images", () => ({
  deleteImages: vi.fn(() => Promise.resolve(1)),
}));
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/image-form-mocks")
);
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../tests/image-form-mocks")
);
// A stored Image is drawn through the image server: here, a tile the picture's size.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));
// jscpd:ignore-end

/** A phone page's own width: the screen less the Section's gutters. */
const PHONE_PAGE_PX = 360;

/** Under one pixel nothing is seen to move: Safari on Linux rounds one line
 *  of the Edit form half a pixel off its bar. */
const SEEN_PX = 1;
/** How far apart two measured heights are; no number when one is missing, which no limit passes. */
const movedPx = (skeleton = Number.NaN, real = Number.NaN) =>
  Math.abs(skeleton - real);

const BOTH = [App.BACK_OFFICE, App.LAURA];
const IMAGE = imageBody();

beforeEach(() => {
  replace.mockClear();
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("AddImageSkeleton", () => {
  it.each(FORM_WIDTHS)(
    "is as tall as the empty Add form on %s, so nothing moves when it arrives",
    async (_, width) => {
      const real = await heightAt(width, <AddImage apps={BOTH} />);
      await expect
        .element(page.getByText(enT("Common.ImageUpload.pick.none")))
        .toBeVisible();
      const skeleton = await heightAt(width, <AddImageSkeleton />);
      expect(movedPx(skeleton, real)).toBeLessThan(SEEN_PX);
    }
  );

  // On a phone's screen the picker is a square icon button: a placeholder of
  // any fixed width squeezes the hint beside it onto more lines.
  it("is as tall as the empty Add form on a phone's screen", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const real = await heightAt(PHONE_PAGE_PX, <AddImage apps={BOTH} />);
    await expect
      .element(page.getByText(enT("Common.ImageUpload.pick.none")))
      .toBeVisible();
    const skeleton = await heightAt(PHONE_PAGE_PX, <AddImageSkeleton />);
    expect(movedPx(skeleton, real)).toBeLessThan(SEEN_PX);
  });

  it("draws the picker's placeholder as wide as the picker", async () => {
    const real = await heightAt(PHONE_PAGE_PX, <AddImage apps={BOTH} />);
    const picker = page
      .getByRole("button", {
        exact: true,
        name: enT("Common.ImageUpload.pick.button"),
      })
      .element()
      .getBoundingClientRect().width;
    await heightAt(PHONE_PAGE_PX, <AddImageSkeleton />);
    const placeholder = document
      .querySelector('[data-part="picker"]')
      ?.getBoundingClientRect().width;
    expect(real).toBeGreaterThan(0);
    expect(placeholder).toBeCloseTo(picker, 0);
  });

  it("says the page is loading, without its parts being read", async () => {
    await renderInApp({ children: <AddImageSkeleton /> });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(EN.Images.loading);
    expect(document.querySelector('[data-skeleton="form"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});

describe("EditImageSkeleton", () => {
  it.each(FORM_WIDTHS)(
    "is as tall as the Edit form on %s, so nothing moves when the Image arrives",
    async (_, width) => {
      const real = await heightAt(
        width,
        <EditImage image={IMAGE} offered={BOTH} />
      );
      await expect
        .element(page.getByRole("form", { name: EN.Images.edit.title }))
        .toBeVisible();
      const skeleton = await heightAt(width, <EditImageSkeleton />);
      expect(movedPx(skeleton, real)).toBeLessThan(SEEN_PX);
    }
  );

  it("says the page is loading, without its parts being read", async () => {
    await renderInApp({ children: <EditImageSkeleton /> });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(EN.Images.loading);
    expect(document.querySelector('[data-skeleton="form"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});
