// @module-tag integration

import { page, userEvent } from "vitest/browser";
import { GALLERY_PAGE } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import type { GalleryItem } from "../../utils/feed-patch";
import { PhotoGrid } from "../photo-grid";
import { PhotoTile } from "../photo-tile";

// A stored Image is drawn through the image server: here, a mark that records its placeholder.
vi.mock("@allonfire/ui/shared/components/aof-image", () => ({
  AOFStorageImage: ({
    className,
    placeholder,
  }: {
    className?: string;
    placeholder?: string;
  }) => (
    <span
      className={className}
      data-placeholder={placeholder}
      data-testid="picture"
    />
  ),
}));

/** A fixture that is missing is a broken test, never a skipped one. */
const fail = (message: string): never => {
  throw new Error(message);
};
const WIDTHS = [
  ["a wide page", 900],
  ["a phone", 360],
] as const;
/** Half a row of the grid is the most a whole number of rows can be off the stored ratio. */
const RATIO_TOLERANCE = 0.02;
const PHOTO = GALLERY_PAGE.items.at(0) ?? fail("the fixture has photos");
const onOpen = vi.fn();
/** The heart's edge to the photo's: the button's own air included. */
const HEART_INSET_MAX_PX = 8;

const tile = (image: GalleryItem, language: "en" | "it" = "en") => (
  <PhotoGrid aria-label="Photos">
    <PhotoTile
      canMark={false}
      image={image}
      language={language}
      lcp
      onOpen={onOpen}
    />
  </PhotoGrid>
);

const renderTile = (image: GalleryItem, width = 900) =>
  renderInApp({
    children: (
      <div className="@container" style={{ width }}>
        {tile(image)}
      </div>
    ),
  });

beforeEach(() => onOpen.mockClear());

const COLUMNS = [
  ["a very narrow screen", 300, 1],
  ["a phone", 360, 2],
  ["a large phone or a small tablet", 600, 3],
  ["a tablet or a wide window", 900, 4],
] as const;

describe("PhotoGrid", () => {
  it.each(COLUMNS)(
    "lays %s (%s px) out in %s columns",
    async (_name, width, columns) => {
      const cells = Array.from({ length: 10 }, (_, index) => ({
        ...PHOTO,
        id: `photo-${index}`,
      }));
      const screen = await renderInApp({
        children: (
          <div className="@container" style={{ width }}>
            <PhotoGrid aria-label="Photos">
              {cells.map((image) => (
                <PhotoTile
                  canMark={false}
                  image={image}
                  key={image.id}
                  language="en"
                  onOpen={onOpen}
                />
              ))}
            </PhotoGrid>
          </div>
        ),
      });
      await expect.element(screen.getByRole("list")).toBeVisible();
      const lefts = new Set(
        [...screen.container.querySelectorAll("li")].map(
          (cell) => cell.offsetLeft
        )
      );
      expect(lefts.size).toBe(columns);
    }
  );
});

describe("PhotoTile", () => {
  it.each(
    WIDTHS.flatMap(([name, width]) =>
      GALLERY_PAGE.items.map((image) => [name, width, image] as const)
    )
  )(
    "keeps the stored ratio before the picture loads on %s (%d px), so nothing shifts",
    async (_, width, image) => {
      const screen = await renderTile(image, width);
      await expect.element(screen.getByRole("listitem")).toBeVisible();
      const box = screen
        .getByRole("listitem")
        .element()
        .getBoundingClientRect();
      const stored = image.width / image.height;
      expect(Math.abs(box.width / box.height / stored - 1)).toBeLessThan(
        RATIO_TOLERANCE
      );
    }
  );

  it("is a button named by the alt", async () => {
    await renderTile(PHOTO);
    await expect
      .element(page.getByRole("button", { name: PHOTO.alt.en }))
      .toBeVisible();
  });

  it("is named by the open words when the photo is decorative", async () => {
    await renderTile({ ...PHOTO, alt: { en: "", it: "" } });
    await expect
      .element(page.getByRole("button", { name: enT("Gallery.photo.open") }))
      .toBeVisible();
  });

  it("opens with its id on click, Enter and Space", async () => {
    await renderTile(PHOTO);
    const button = page.getByRole("button", { name: PHOTO.alt.en });
    await button.click();
    button.element().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onOpen.mock.calls).toEqual([[PHOTO.id], [PHOTO.id], [PHOTO.id]]);
  });

  it("keeps an Admin's heart close to the photo's corner", async () => {
    await renderInApp({
      children: (
        <div className="@container" style={{ width: 900 }}>
          <PhotoGrid aria-label="Photos">
            <PhotoTile
              canMark
              image={PHOTO}
              language="en"
              lcp
              onOpen={onOpen}
            />
          </PhotoGrid>
        </div>
      ),
    });
    const photo = page
      .getByRole("button", { name: `Photo ${PHOTO.id}` })
      .element()
      .getBoundingClientRect();
    const heart = page
      .getByRole("button", {
        name: enT("Gallery.favorite.toggle"),
        pressed: true,
      })
      .element()
      .querySelector("svg")
      ?.getBoundingClientRect();
    expect(heart).toBeDefined();
    expect(photo.right - (heart?.right ?? 0)).toBeLessThanOrEqual(
      HEART_INSET_MAX_PX
    );
    expect(photo.bottom - (heart?.bottom ?? 0)).toBeLessThanOrEqual(
      HEART_INSET_MAX_PX
    );
  });

  it("shows the stored blur while the picture loads", async () => {
    await renderTile(PHOTO);
    await expect
      .element(page.getByTestId("picture"))
      .toHaveAttribute("data-placeholder", "blur");
  });
});
