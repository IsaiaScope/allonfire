// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { FORM_WIDTHS, heightAtIn } from "@allonfire/ui/shared/tests/height-at";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { Upload } from "../upload";
import { UploadSkeleton } from "../upload-skeleton";

// jscpd:ignore-start
// Hoisted mocks: a `vi.mock` cannot move into a shared helper, and the Back Office's twin and this App's other suite need the same ones.
vi.mock("../../actions/add-image", () => ({ addImage: vi.fn() }));
vi.mock("@/features/i18n/navigation", () => import("../../tests/upload-mocks"));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../tests/upload-mocks")
);
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("../../tests/upload-mocks")
);

// jscpd:ignore-end

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

const heightOf = (width: number, view: React.ReactNode) =>
  heightAtIn({ messages: EN, view, width });

describe("UploadSkeleton", () => {
  it.each(FORM_WIDTHS)(
    "is as tall as the empty Upload form on %s, so nothing moves when it arrives",
    async (_, width) => {
      const real = await heightOf(width, <Upload />);
      await expect
        .element(page.getByText(enT("Common.ImageUpload.pick.none")))
        .toBeVisible();
      const skeleton = await heightOf(width, <UploadSkeleton />);
      expect(skeleton).toBeCloseTo(real ?? 0, 0);
    }
  );

  it("says the page is loading, without its parts being read", async () => {
    await renderInApp({ children: <UploadSkeleton /> });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(EN.Upload.loading);
    expect(document.querySelector('[data-skeleton="form"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});
