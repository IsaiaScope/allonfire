// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { App } from "@allonfire/database/enums";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
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
// A stored Image is drawn through the image server: here, a tile the picture's size.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@/shared/tests/image-mock")).ImageMock,
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));
// jscpd:ignore-end

/** As wide as the form's page beside the sidebar, where the fields pair up. */
const WIDE_PX = 900;
/** As narrow as a phone's page, where they stack. */
const NARROW_PX = 360;
/** Between the two: one column, but more room than a phone (a tablet; a narrow window). */
const MID_PX = 520;
const WIDTHS = [
  ["a wide page", WIDE_PX],
  ["a tablet", MID_PX],
  ["a phone", NARROW_PX],
] as const;
const BOTH = [App.BACK_OFFICE, App.LAURA];
const IMAGE = imageBody();

/** The page's body, `width` wide inside the container the Section gives it, as `view` draws it. */
const heightAt = async (width: number, view: ReactNode) => {
  const screen = await renderInApp({
    children: (
      <div className="@container" style={{ width }}>
        {view}
      </div>
    ),
  });
  return screen.container.firstElementChild?.getBoundingClientRect().height;
};

beforeEach(() => {
  replace.mockClear();
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("AddImageSkeleton", () => {
  it.each(WIDTHS)(
    "is as tall as the empty Add form on %s, so nothing moves when it arrives",
    async (_, width) => {
      const real = await heightAt(width, <AddImage apps={BOTH} />);
      await expect
        .element(page.getByText(EN.Images.add.pick.none))
        .toBeVisible();
      const skeleton = await heightAt(width, <AddImageSkeleton />);
      expect(skeleton).toBeCloseTo(real ?? 0, 0);
    }
  );

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
  it.each(WIDTHS)(
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
      expect(skeleton).toBeCloseTo(real ?? 0, 0);
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
