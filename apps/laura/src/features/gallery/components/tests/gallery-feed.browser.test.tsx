// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { delay, HttpResponse, http } from "msw";
import { page } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import {
  GALLERY_PAGE,
  GALLERY_PAGE_TWO,
  GALLERY_URL,
} from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { GALLERY } from "../../constants/gallery";
import { invalidateGallery } from "../../utils/gallery-mutations";
import { GalleryFeed } from "../gallery-feed";
import {
  answer,
  Feed,
  feedClient,
  NOTHING,
  ONLY_PAGE,
  tiles,
} from "./feed-harness";

// A stored Image is drawn through the image server: here, a mark.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  ...(await import("@allonfire/ui/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));
const keepFresh = vi.hoisted(() => vi.fn());
vi.mock("@allonfire/ui/features/query/hooks/use-aof-link-refresh", () => ({
  useAOFLinkRefresh: keepFresh,
}));

beforeEach(() => {
  keepFresh.mockClear();
});

describe("GalleryFeed", () => {
  it("draws the first page's tiles at once, with no request", async () => {
    const asked = answer();
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await expect.element(tiles().nth(2)).toBeVisible();
    expect(tiles().elements()).toHaveLength(ONLY_PAGE.items.length);
    expect(asked).toEqual([]);
    await expect
      .element(page.getByRole("list", { name: enT("Gallery.list") }))
      .toBeVisible();
  });

  it("asks the next page with the cursor and appends it to the same grid, the first tiles staying put", async () => {
    const asked = answer(GALLERY_PAGE_TWO);
    await renderInApp({ children: <Feed /> });
    const first = tiles().nth(0);
    await expect.element(first).toBeVisible();
    const before = first.element().getBoundingClientRect();
    await expect.poll(() => tiles().elements().length).toBe(5);
    expect(asked).toEqual([GALLERY_PAGE.nextCursor]);
    expect(first.element().getBoundingClientRect()).toEqual(before);
    expect(document.querySelectorAll("ul")).toHaveLength(1);
  });

  it("offers no more once the last page is loaded", async () => {
    answer(GALLERY_PAGE_TWO);
    await renderInApp({ children: <Feed /> });
    await expect.poll(() => tiles().elements().length).toBe(5);
    expect(
      page.getByRole("button", { name: enT("Gallery.more.load") }).elements()
    ).toHaveLength(0);
  });

  it("says nothing is there yet in the words of the list, and of an Admin", async () => {
    await renderInApp({ children: <Feed body={NOTHING} /> });
    await expect
      .element(page.getByText(enT("Gallery.empty.title")))
      .toBeVisible();
    await expect
      .element(page.getByText(enT("Gallery.empty.description")))
      .toBeVisible();
  });

  it("points an Admin to Upload when nothing is there", async () => {
    await renderInApp({ children: <Feed body={NOTHING} canMark /> });
    await expect
      .element(page.getByText(enT("Gallery.empty.admin")))
      .toBeVisible();
  });
});

describe("GalleryFeed when a read goes wrong or a page comes again", () => {
  it("keeps the button on screen, disabled and saying so, while the next page is on its way", async () => {
    worker.use(
      http.get(GALLERY_URL, async () => {
        await delay("infinite");
        return HttpResponse.json(GALLERY_PAGE_TWO);
      })
    );
    await renderInApp({ children: <Feed /> });
    const loading = page.getByRole("button", {
      name: enT("Gallery.more.loading"),
    });
    await expect.element(loading).toBeVisible();
    await expect.element(loading).toBeDisabled();
    expect(
      page.getByRole("button", { name: enT("Gallery.more.load") }).elements()
    ).toHaveLength(0);
    // The request never answers: drop it with the client, so its abort never toasts in the next test.
    feedClient().clear();
  });

  it("offers Retry when the first load fails, with no toast, and draws the photos after it", async () => {
    worker.use(
      http.get(GALLERY_URL, () =>
        HttpResponse.json({}, { status: HTTP.STATUS.INTERNAL_SERVER_ERROR })
      )
    );
    await renderInApp({
      children: <GalleryFeed canMark={false} source={GALLERY.SOURCE.GALLERY} />,
    });
    await expect
      .element(page.getByText(enT("Gallery.error.title")))
      .toBeVisible();
    expect(
      page.getByText(enT("Common.Request.failed")).elements()
    ).toHaveLength(0);
    answer(ONLY_PAGE);
    await page
      .getByRole("button", { name: enT("Gallery.error.retry") })
      .click();
    await expect.element(tiles().nth(2)).toBeVisible();
  });

  it("keeps the photos when a later page fails, and asks again from its Retry", async () => {
    worker.use(
      http.get(GALLERY_URL, () =>
        HttpResponse.json({}, { status: HTTP.STATUS.INTERNAL_SERVER_ERROR })
      )
    );
    await renderInApp({ children: <Feed /> });
    const retry = page.getByRole("button", {
      name: enT("Gallery.more.retry"),
    });
    await expect.element(retry).toBeVisible();
    // The words show above the button, and are announced at once.
    const words = page.getByRole("alert");
    await expect.element(words).toBeVisible();
    await expect.element(words).toHaveTextContent(enT("Gallery.more.failed"));
    expect(tiles().elements()).toHaveLength(GALLERY_PAGE.items.length);
    answer(GALLERY_PAGE_TWO);
    await page.getByRole("button", { name: enT("Gallery.more.retry") }).click();
    await expect.poll(() => tiles().elements().length).toBe(5);
  });

  it("reads every loaded page again in order on an invalidation, the tiles staying on screen", async () => {
    const asked = answer(GALLERY_PAGE_TWO);
    await renderInApp({ children: <Feed /> });
    await expect.poll(() => tiles().elements().length).toBe(5);
    asked.length = 0;
    worker.use(
      http.get(GALLERY_URL, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get("cursor"));
        return HttpResponse.json(
          asked.length === 1 ? GALLERY_PAGE : GALLERY_PAGE_TWO
        );
      })
    );
    const refetching = invalidateGallery(feedClient());
    expect(tiles().elements()).toHaveLength(5);
    await refetching;
    expect(asked).toEqual([null, GALLERY_PAGE.nextCursor]);
    expect(tiles().elements()).toHaveLength(5);
  });

  it("keeps the two loaded pages when its page renders again", async () => {
    answer(GALLERY_PAGE_TWO);
    await renderInApp({ children: <Feed /> });
    await expect.poll(() => tiles().elements().length).toBe(5);
    await page.getByRole("button", { name: "Render again" }).click();
    expect(tiles().elements()).toHaveLength(5);
  });

  it("keeps its links fresh across the whole Gallery", async () => {
    await renderInApp({ children: <Feed body={ONLY_PAGE} /> });
    await expect.element(tiles().nth(0)).toBeVisible();
    expect(keepFresh).toHaveBeenCalledWith({
      queryKey: QUERY.GALLERY.ALL,
      refreshMs: GALLERY.LINK_REFRESH_MS,
    });
  });
});
