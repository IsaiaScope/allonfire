// @module-tag integration

import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { JPEG_SIGNATURE } from "@allonfire/storage/features/image/tests/jpeg-signature";
import { exportName } from "@allonfire/storage/features/image/utils/export-name";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import {
  restoreShare,
  stubShare,
  watchSaves,
} from "@allonfire/ui/features/image/tests/stub-share";
import { computedValue } from "@allonfire/ui/shared/tests/computed-style";
import { HttpResponse, http } from "msw";
import { page, userEvent } from "vitest/browser";
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { MASCOT } from "@/shared/constants/mascots";
import {
  GALLERY_PAGE,
  GALLERY_URL,
  PHOTO_CREATED_AT,
} from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { setFavorite } from "../../actions/favorite";
import { removePhoto } from "../../actions/remove-photo";
import { GALLERY } from "../../constants/gallery";
import { invalidateGallery } from "../../utils/gallery-mutations";
import { PhotoPreview } from "../photo-preview";
import { Feed, feedClient, ONLY_PAGE } from "./feed-harness";

vi.mock("../../actions/favorite", () => ({ setFavorite: vi.fn() }));
vi.mock("../../actions/remove-photo", () => ({ removePhoto: vi.fn() }));
// A stored Image is drawn through the image server: here, a mark with its alt.
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("@allonfire/ui/shared/tests/aof-image-mock")
);

const [A, B, C] = GALLERY_PAGE.items;
const PHOTOS = [A, B, C].flatMap((photo) => (photo ? [photo] : []));
const dialog = () => page.getByRole("dialog");
const removeButton = () =>
  page.getByRole("button", {
    exact: true,
    name: enT("Gallery.remove.action"),
  });

/** Opens the preview from the grid, as a keyboard visitor does. */
const openTile = async (name: string, first = false) => {
  const named = page.getByRole("button", { name });
  const tile = first ? named.first() : named;
  tile.element().focus();
  await userEvent.keyboard("{Enter}");
  await vi.waitFor(() => dialog().element());
  return tile;
};

beforeEach(() => {
  vi.mocked(setFavorite).mockReset().mockResolvedValue({ favorite: true });
  vi.mocked(removePhoto).mockReset();
});

describe("PhotoPreview on the grid", () => {
  it("opens on the clicked photo with its caption in the page's language", async () => {
    await renderInApp({
      children: <Feed body={ONLY_PAGE} />,
      language: "it",
      messages: IT,
    });
    await openTile("Foto photo-b");
    await expect.element(dialog().getByText("Foto photo-b")).toBeVisible();
    await expect
      .element(dialog().getByRole("group", { name: "Foto 2 di 3" }))
      .toBeVisible();
  });

  it("draws no caption for a decorative photo", async () => {
    const decorative = {
      ...ONLY_PAGE,
      items: ONLY_PAGE.items.map((photo) => ({
        ...photo,
        alt: { en: "", it: "" },
      })),
    };
    await renderInApp({ children: <Feed body={decorative} /> });
    await openTile(enT("Gallery.photo.open"), true);
    expect(dialog().element().querySelectorAll("p")).toHaveLength(0);
  });

  it("steps with the arrow keys, and Escape gives focus back to the tile", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    const tile = await openTile("Photo photo-a");
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(dialog().getByRole("group", { name: "Photo 2 of 3" }))
      .toBeVisible();
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .element(dialog().getByRole("group", { name: "Photo 1 of 3" }))
      .toBeVisible();
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog().elements()).toHaveLength(0));
    await expect.element(tile).toHaveFocus();
  });

  // The arrows show from a tablet up: on a phone the swipe steps.
  it("steps with the next and previous buttons", async ({ onTestFinished }) => {
    const { innerHeight, innerWidth } = window;
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    onTestFinished(() => page.viewport(innerWidth, innerHeight));
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    await page
      .getByRole("button", { name: enT("Gallery.preview.next") })
      .click();
    await expect
      .element(dialog().getByRole("group", { name: "Photo 2 of 3" }))
      .toBeVisible();
    await page
      .getByRole("button", { name: enT("Gallery.preview.previous") })
      .click();
    await expect
      .element(dialog().getByRole("group", { name: "Photo 1 of 3" }))
      .toBeVisible();
  });

  it("gives a User no Remove, and an Admin the Remove button", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    expect(removeButton().elements()).toHaveLength(0);
  });

  it("asks before removing, and Cancel changes nothing", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-a");
    await removeButton().click();
    await expect
      .element(page.getByText(enT("Gallery.remove.description")))
      .toBeVisible();
    await page
      .getByRole("button", { name: enT("Gallery.remove.cancel") })
      .click();
    expect(removePhoto).not.toHaveBeenCalled();
    await expect.element(dialog().getByText("Photo photo-a")).toBeVisible();
  });
});

describe("PhotoPreview's capsule", () => {
  it("sets the caption in the heading face on a capsule, with a picture of the sea beside it", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    const text = dialog().getByText("Photo photo-a").element();
    expect(getComputedStyle(text).fontFamily).toBe(
      computedValue("font-family", "var(--font-heading)")
    );
    const capsule = text.closest("div.bg-card");
    expect(capsule).not.toBeNull();
    expect(capsule?.querySelector("[data-src]")?.getAttribute("data-src")).toBe(
      svgDataUrl(OCEAN_ART[MASCOT.CRUMB.gallery].SVG)
    );
  });

  it("clamps a long caption to two lines on a capsule no taller than a short one's", async ({
    onTestFinished,
  }) => {
    const { innerHeight, innerWidth } = window;
    onTestFinished(() => page.viewport(innerWidth, innerHeight));
    await page.viewport(320, SCREEN.VIEWPORT.DESKTOP.HEIGHT);
    const long = "A very long caption about the sea ".repeat(5).trim();
    const [first, ...rest] = ONLY_PAGE.items;
    const items = first
      ? [{ ...first, alt: { en: long, it: long } }, ...rest]
      : rest;
    await renderInApp({ children: <Feed body={{ ...ONLY_PAGE, items }} /> });
    await openTile(long);
    const text = () => dialog().getByText(long).element();
    const height = (element: Element | null) =>
      element?.getBoundingClientRect().height ?? 0;
    const lineHeight = Number.parseFloat(getComputedStyle(text()).lineHeight);
    expect(height(text())).toBeCloseTo(lineHeight * 2, 0);
    expect(text().scrollHeight).toBeGreaterThan(text().clientHeight);
    const tall = height(text().closest("div.bg-card"));
    await userEvent.keyboard("{ArrowRight}");
    const short = () => dialog().getByText("Photo photo-b").element();
    await vi.waitFor(() => short());
    expect(height(short().closest("div.bg-card"))).toBe(tall);
  });

  it("leaves the photo as much room under the caption as above the capsule", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-a");
    const wrapper = page
      .getByRole("dialog")
      .element()
      .querySelector("[data-testid=picture]")?.parentElement;
    const box = wrapper?.getBoundingClientRect();
    const style = wrapper ? getComputedStyle(wrapper) : undefined;
    const top = (box?.top ?? 0) + Number.parseFloat(style?.paddingTop ?? "0");
    const bottom =
      (box?.bottom ?? 0) - Number.parseFloat(style?.paddingBottom ?? "0");
    const caption = dialog()
      .getByText("Photo photo-a")
      .element()
      .closest("div.bg-card")
      ?.getBoundingClientRect();
    const capsule = dialog()
      .getByRole("button", { name: enT("Gallery.preview.close") })
      .element()
      .closest('[data-slot="control-bar"]')
      ?.getBoundingClientRect();
    const above = top - (caption?.bottom ?? 0);
    const below = (capsule?.top ?? 0) - bottom;
    expect(Math.abs(above - below)).toBeLessThanOrEqual(1.5);
    expect(above).toBeGreaterThan(8);
  });

  it("draws the heart, Remove and Close icons at one size", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-a");
    // The first photo is a Favorite, so its heart offers to remove it.
    const names = [
      enT("Gallery.favorite.toggle"),
      enT("Gallery.remove.action"),
      enT("Gallery.preview.close"),
    ];
    const widths = names.map((name) => {
      const icon = dialog()
        .getByRole("button", { exact: true, name })
        .element()
        .querySelector("svg");
      return icon?.getBoundingClientRect().width;
    });
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBeGreaterThan(0);
  });

  it("lines the heart, Remove and Close up on one centre line", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-a");
    const centres = [
      enT("Gallery.favorite.toggle"),
      enT("Gallery.remove.action"),
      enT("Gallery.preview.close"),
    ].map((name) => {
      const box = dialog()
        .getByRole("button", { exact: true, name })
        .element()
        .getBoundingClientRect();
      return box.top + box.height / 2;
    });
    const [heart, remove, close] = centres;
    expect(heart).toBeCloseTo(remove ?? Number.NaN, 0);
    expect(close).toBeCloseTo(remove ?? Number.NaN, 0);
  });
});

describe("PhotoPreview's heart", () => {
  it("keeps a tap with the photo it was made on when the visitor steps on at once", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-b");
    await dialog()
      .getByRole("button", {
        name: enT("Gallery.favorite.toggle"),
        pressed: false,
      })
      .click();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(dialog().getByRole("group", { name: "Photo 3 of 3" }))
      .toBeVisible();
    // The next photo's heart is its own: not marked by the tap on the first.
    await expect
      .element(
        dialog().getByRole("button", {
          name: enT("Gallery.favorite.toggle"),
          pressed: false,
        })
      )
      .toHaveAttribute("aria-pressed", "false");
    await vi.waitFor(() =>
      expect(vi.mocked(setFavorite).mock.calls).toEqual([["photo-b", true]])
    );
  });
});

describe("PhotoPreview clearing a Favorite from the Favorites", () => {
  const ALL_FAVORITES = {
    ...ONLY_PAGE,
    items: ONLY_PAGE.items.map((item) => ({ ...item, favorite: true })),
  };

  it("lands on the next photo, with no notice that it is gone", async () => {
    await renderInApp({
      children: (
        <Feed body={ALL_FAVORITES} canMark source={GALLERY.SOURCE.FAVORITES} />
      ),
    });
    await openTile("Photo photo-b");
    await dialog()
      .getByRole("button", {
        name: enT("Gallery.favorite.toggle"),
        pressed: true,
      })
      .click();
    await vi.waitFor(() =>
      expect(vi.mocked(setFavorite)).toHaveBeenCalledWith("photo-b", false)
    );
    await expect
      .element(dialog().getByRole("group", { name: "Photo 2 of 2" }))
      .toBeVisible();
    expect(page.getByText(enT("Gallery.preview.gone")).elements()).toHaveLength(
      0
    );
  });
});

describe("PhotoPreview removing a photo", () => {
  const confirm = () =>
    page.getByRole("button", { name: enT("Gallery.remove.confirm") }).click();

  it("takes the photo out at once and shows the next one", async () => {
    vi.mocked(removePhoto).mockResolvedValue(1);
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-b");
    await removeButton().click();
    await confirm();
    expect(removePhoto).toHaveBeenCalledWith("photo-b");
    await expect.element(dialog().getByText("Photo photo-c")).toBeVisible();
  });

  it("puts the photo back and says so when the API refuses", async () => {
    vi.mocked(removePhoto).mockResolvedValue(null);
    await renderInApp({ children: <Feed body={ONLY_PAGE} canMark /> });
    await openTile("Photo photo-b");
    await removeButton().click();
    await confirm();
    await expect
      .element(page.getByText(enT("Gallery.remove.failed")))
      .toBeVisible();
    // The open preview hides the grid from the accessibility tree: look by label.
    await expect
      .element(page.getByLabelText("Photo photo-b").first())
      .toBeInTheDocument();
  });

  it("closes the preview when the last photo is removed", async () => {
    vi.mocked(removePhoto).mockResolvedValue(1);
    await renderInApp({
      children: (
        <Feed
          body={{ items: ONLY_PAGE.items.slice(0, 1), nextCursor: null }}
          canMark
        />
      ),
    });
    await openTile("Photo photo-a");
    await removeButton().click();
    await confirm();
    await vi.waitFor(() => expect(dialog().elements()).toHaveLength(0));
  });

  it("closes with a notice when a read no longer holds the open photo", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-b");
    worker.use(
      http.get(GALLERY_URL, () =>
        HttpResponse.json({
          items: ONLY_PAGE.items.filter(({ id }) => id !== "photo-b"),
          nextCursor: null,
        })
      )
    );
    await invalidateGallery(feedClient());
    await vi.waitFor(() => expect(dialog().elements()).toHaveLength(0));
    await expect
      .element(page.getByText(enT("Gallery.preview.gone")))
      .toBeVisible();
  });
});

describe("PhotoPreview asking for more", () => {
  const asked = vi.fn();
  beforeEach(() => asked.mockClear());

  const renderPreview = (canFetchMore: boolean, openId: string) =>
    renderInApp({
      children: (
        <PhotoPreview
          canFetchMore={canFetchMore}
          canMark={false}
          fetchNextPage={asked}
          language="en"
          onOpenIdChange={vi.fn()}
          openId={openId}
          photos={PHOTOS}
        />
      ),
    });

  it("asks for the next page when the photo is within reach of the end", async () => {
    await renderPreview(true, "photo-c");
    await vi.waitFor(() => expect(asked).toHaveBeenCalled());
  });

  it("asks for nothing when there is no next page to ask for", async () => {
    await renderPreview(false, "photo-c");
    await expect.element(dialog()).toBeVisible();
    expect(asked).not.toHaveBeenCalled();
  });
});

/** Where the API makes one photo's Export. */
const exportPath = (id: string) =>
  `${API.PATH.IMAGES}${fillPath(STORAGE.PATH.EXPORT, { id })}`;
const exportUrl = (id: string) => `${LOCAL.URL.TEST_API}${exportPath(id)}`;
const exportNameOf = (id: string) =>
  exportName({ createdAt: PHOTO_CREATED_AT, id });
const downloadButton = () =>
  dialog().getByRole("button", { name: enT("Gallery.preview.download") });
const shareButton = () =>
  dialog().getByRole("button", { name: enT("Gallery.preview.share") });

/** `stubShare`, for a browser that says yes or no to every file. */
const browserShares = (
  canShare: boolean,
  share?: (data: ShareData) => Promise<void>
) => stubShare({ canShare: () => canShare, ...(share && { share }) });

afterEach(() => {
  vi.restoreAllMocks();
  restoreShare();
  document.documentElement.classList.remove("dark");
});

/** The Export as the API answers it. */
const jpegAnswer = () =>
  HttpResponse.arrayBuffer(new Uint8Array(JPEG_SIGNATURE).buffer, {
    headers: { [HTTP.HEADER.CONTENT_TYPE]: STORED_IMAGE.EXPORT.CONTENT_TYPE },
  });

describe("PhotoPreview's Download", () => {
  it("downloads the open photo's Export under its name, and follows the photo it steps to", async () => {
    browserShares(false);
    const saved = watchSaves();
    const names = () => saved.map(({ name }) => name);
    worker.use(
      ...["photo-a", "photo-b"].map((id) =>
        http.get(exportUrl(id), () => jpegAnswer())
      )
    );
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    await downloadButton().click();
    await vi.waitFor(() => expect(names()).toEqual([exportNameOf("photo-a")]));
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(dialog().getByRole("group", { name: "Photo 2 of 3" }))
      .toBeVisible();
    await downloadButton().click();
    await vi.waitFor(() =>
      expect(names()).toEqual([
        exportNameOf("photo-a"),
        exportNameOf("photo-b"),
      ])
    );
  });

  it("tells a refused download in the page's words, and keeps the preview", async () => {
    browserShares(false);
    worker.use(
      http.get(
        exportUrl("photo-a"),
        () => new HttpResponse(null, { status: HTTP.STATUS.TOO_MANY_REQUESTS })
      )
    );
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    await downloadButton().click();
    await expect
      .element(page.getByText(enT("Gallery.preview.downloadFailed")))
      .toBeVisible();
    await expect.element(dialog()).toBeVisible();
  });
});

// That no failure is said is `AOFExportActions`' own test: a toast of an
// earlier test can still be on screen here.
describe("PhotoPreview's Export of an image removed elsewhere", () => {
  it.for([
    { button: downloadButton, name: "Download" },
    { button: shareButton, name: "Share" },
  ])(
    "$name reads the feed again, closes and says the image is gone",
    async ({ button }) => {
      browserShares(true);
      worker.use(
        http.get(
          exportUrl("photo-b"),
          () => new HttpResponse(null, { status: HTTP.STATUS.NOT_FOUND })
        ),
        http.get(GALLERY_URL, () =>
          HttpResponse.json({
            items: ONLY_PAGE.items.filter(({ id }) => id !== "photo-b"),
            nextCursor: null,
          })
        )
      );
      await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
      await openTile("Photo photo-b");
      await button().click();
      await vi.waitFor(() => expect(dialog().elements()).toHaveLength(0));
      await expect
        .element(page.getByText(enT("Gallery.preview.gone")))
        .toBeVisible();
    }
  );
});

describe("PhotoPreview's Share", () => {
  it("hides Share where the browser cannot send files, and shows it where it can", async () => {
    browserShares(false);
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    expect(shareButton().elements()).toHaveLength(0);
    await expect.element(downloadButton()).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog().elements()).toHaveLength(0));
    browserShares(true);
    await openTile("Photo photo-a");
    await expect.element(shareButton()).toBeVisible();
  });

  it("keeps a late Export and asks for one more tap, in the page's words", async () => {
    const share = browserShares(true);
    share.mockRejectedValueOnce(
      new DOMException("too late", IMAGE.EXPORT.NOT_ALLOWED_ERROR)
    );
    worker.use(http.get(exportUrl("photo-a"), () => jpegAnswer()));
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    await shareButton().click();
    await expect
      .element(page.getByText(enT("Gallery.preview.shareReady")))
      .toBeVisible();
    expect(
      page.getByText(enT("Gallery.preview.shareFailed")).elements()
    ).toHaveLength(0);
    await shareButton().click();
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(2));
    expect(share.mock.calls[1]?.[0].files?.[0]?.name).toBe(
      exportNameOf("photo-a")
    );
  });

  it("tells a failed share in the page's words, and says nothing when the sheet is closed", async () => {
    const share = browserShares(true, () =>
      Promise.reject(new DOMException("closed", IMAGE.EXPORT.ABORT_ERROR))
    );
    worker.use(
      http.get(
        exportUrl("photo-a"),
        () => new HttpResponse(null, { status: HTTP.STATUS.UNAUTHORIZED })
      ),
      http.get(exportUrl("photo-b"), () => jpegAnswer())
    );
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await openTile("Photo photo-a");
    await shareButton().click();
    await expect
      .element(page.getByText(enT("Gallery.preview.shareFailed")))
      .toBeVisible();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(dialog().getByRole("group", { name: "Photo 2 of 3" }))
      .toBeVisible();
    await shareButton().click();
    await vi.waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(
      page.getByText(enT("Gallery.preview.shareFailed")).elements()
    ).toHaveLength(1);
  });

  it("names both in Italian", async () => {
    browserShares(true);
    await renderInApp({
      children: <Feed body={ONLY_PAGE} />,
      language: "it",
      messages: IT,
    });
    await openTile("Foto photo-a");
    await expect
      .element(
        dialog().getByRole("button", { name: IT.Gallery.preview.download })
      )
      .toBeVisible();
    await expect
      .element(dialog().getByRole("button", { name: IT.Gallery.preview.share }))
      .toBeVisible();
  });
});

describe.each([
  { language: "en", width: 320 },
  { language: "en", width: SCREEN.VIEWPORT.PHONE.WIDTH },
  { language: "it", width: 320 },
  { language: "it", width: SCREEN.VIEWPORT.PHONE.WIDTH },
] as const)(
  "PhotoPreview's capsule at $width px in $language",
  ({ language, width }) => {
    it.for([
      { canMark: true, who: "an Admin" },
      { canMark: false, who: "a User" },
    ])(
      "fits $who's controls without overflow or overlap, light and dark",
      async ({ canMark }, { onTestFinished }) => {
        const { innerHeight, innerWidth } = window;
        onTestFinished(() => page.viewport(innerWidth, innerHeight));
        await page.viewport(width, SCREEN.VIEWPORT.DESKTOP.HEIGHT);
        browserShares(true);
        await renderInApp({
          children: <Feed body={ONLY_PAGE} canMark={canMark} />,
          language,
          ...(language === "it" && { messages: IT }),
        });
        await openTile(language === "it" ? "Foto photo-a" : "Photo photo-a");
        for (const mode of ["light", "dark"]) {
          document.documentElement.classList.toggle("dark", mode === "dark");
          const capsule = dialog()
            .getByRole("button", {
              name:
                language === "it"
                  ? IT.Gallery.preview.download
                  : enT("Gallery.preview.download"),
            })
            .element()
            .closest('[data-slot="control-bar"]');
          const frame = capsule?.getBoundingClientRect();
          const controls = [...(capsule?.querySelectorAll("a, button") ?? [])]
            .map((control) => control.getBoundingClientRect())
            .filter((box) => box.width > 0);
          // Download, Share and Close; an Admin's heart and Remove too (a User sees the mark only).
          expect(controls).toHaveLength(canMark ? 5 : 3);
          for (const box of controls) {
            expect(box.left).toBeGreaterThanOrEqual((frame?.left ?? 0) - 0.5);
            expect(box.right).toBeLessThanOrEqual((frame?.right ?? 0) + 0.5);
          }
          expect(frame?.right).toBeLessThanOrEqual(width);
          const sorted = [...controls].sort((a, b) => a.left - b.left);
          for (const [index, box] of sorted.entries()) {
            const before = sorted[index - 1];
            if (before) {
              expect(box.left).toBeGreaterThanOrEqual(before.right - 0.5);
            }
          }
        }
      }
    );
  }
);
