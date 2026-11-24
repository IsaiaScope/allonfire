// @module-tag integration

import {
  CAN_EMULATE_MEDIA,
  clearSafeAreaInsets,
  notchedPhone,
} from "@allonfire/ui/shared/tests/emulated-media";
import { page } from "vitest/browser";
import { GALLERY_PAGE } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { GALLERY } from "../../constants/gallery";
import { GalleryPage } from "../gallery-page";
import { PhotoCell, PhotoGrid } from "../photo-grid";

const SIDES_PX = 8;
const WIDTHS = [
  ["a very narrow screen", 300, 1],
  ["a phone", 390, 2],
  ["a tablet", 800, 4],
] as const;
const [PHOTO] = GALLERY_PAGE.items;
const CELLS = Array.from({ length: 12 }, (_, index) => `cell-${index}`);

/** The page as the app draws it: the Section's own container, with no wrapper to give one. */
const renderPage = (width: number) =>
  renderInApp({
    children: (
      <div style={{ width }}>
        <GalleryPage title="Gallery">
          <PhotoGrid aria-label="Photos">
            {CELLS.map((id) => (
              <PhotoCell
                height={PHOTO?.height ?? 1}
                key={id}
                width={PHOTO?.width ?? 1}
              />
            ))}
          </PhotoGrid>
        </GalleryPage>
      </div>
    ),
  });

describe("GalleryPage", () => {
  it.each(WIDTHS)(
    "is its own container: %s (%s px) gets %s columns",
    async (_name, width, columns) => {
      const screen = await renderPage(width);
      await expect.element(page.getByRole("list")).toBeVisible();
      const cells = [...screen.container.querySelectorAll("li")];
      expect(new Set(cells.map((cell) => cell.offsetLeft)).size).toBe(columns);
    }
  );

  it("measures its rows from its own width, one 40th of a column", async () => {
    const width = 800;
    const screen = await renderPage(width);
    await expect.element(page.getByRole("list")).toBeVisible();
    const [cell] = screen.container.querySelectorAll("li");
    const columns = 4;
    const column = (width - SIDES_PX) / columns;
    const rows = Math.round(
      ((PHOTO?.height ?? 1) / (PHOTO?.width ?? 1)) * GALLERY.GRID.PRECISION
    );
    expect(cell?.getBoundingClientRect().height).toBeCloseTo(
      (rows * column) / GALLERY.GRID.PRECISION,
      0
    );
  });
});

describe.runIf(CAN_EMULATE_MEDIA)("GalleryPage beside a notch", () => {
  const NOTCH_PX = 59;
  const INSETS = { bottom: 21, left: NOTCH_PX, right: NOTCH_PX, top: 0 };
  afterEach(clearSafeAreaInsets);

  const STANDS_CLEAR = "[--frame-inset-left:0px]";
  const NO_SIDEBAR = "[--frame-inset-left:env(safe-area-inset-left,0px)]";
  const leftPaddingWith = async (frameInset: string) => {
    await notchedPhone(INSETS);
    const screen = await renderInApp({
      children: (
        <div className={frameInset}>
          <GalleryPage title="Gallery">
            <p>Photos</p>
          </GalleryPage>
        </div>
      ),
    });
    const section = screen.container.querySelector("section");
    return Number.parseFloat(
      getComputedStyle(section ?? document.body).paddingLeft
    );
  };

  it("keeps clear of the notch only once, not again when the sidebar already stands clear of it", async () => {
    // The docked sidebar clears the notch: the frame's own inset is 0.
    expect(await leftPaddingWith(STANDS_CLEAR)).toBe(SIDES_PX / 2);
  });

  it("keeps clear of the notch when no sidebar stands beside it", async () => {
    expect(await leftPaddingWith(NO_SIDEBAR)).toBeGreaterThanOrEqual(NOTCH_PX);
  });
});
