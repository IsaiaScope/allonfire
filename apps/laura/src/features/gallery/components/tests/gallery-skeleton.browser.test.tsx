// @module-tag integration

import type { GalleryPageBody } from "@allonfire/api/features/laura/constants/schemas";
import { worker } from "@allonfire/config/tests/browser/msw";
import { FORM_WIDTHS } from "@allonfire/ui/shared/tests/height-at";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { http } from "msw";
import { page } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import { GALLERY_PAGE, GALLERY_URL } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { GALLERY } from "../../constants/gallery";
import { GalleryFeed } from "../gallery-feed";
import { GalleryFeedSkeleton } from "../gallery-skeleton";

// A stored Image is drawn through the image server: here, a mark.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  ...(await import("@allonfire/ui/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));

const WIDTHS = FORM_WIDTHS.filter(([, width]) => width !== 520);
const PROTOTYPE = GALLERY_PAGE.items.at(0);

/** A first page of as many photos as the skeleton has tiles, in the skeleton's ratios; more follow it, as they do on a full page. */
const FULL_PAGE: GalleryPageBody = {
  items: Array.from({ length: GALLERY.SKELETON.TILES }, (_, index) => {
    const ratio =
      GALLERY.SKELETON.RATIOS[index % GALLERY.SKELETON.RATIOS.length] ?? 1;
    return {
      ...(PROTOTYPE as NonNullable<typeof PROTOTYPE>),
      height: Math.round(ratio * 1000),
      id: `photo-${index}`,
      width: 1000,
    };
  }),
  nextCursor: "next-page",
};

/** The feed with its first page hydrated, `width` wide as the Section gives it. */
const real = (width: number) => {
  const client = new QueryClient();
  client.setQueryData(QUERY.GALLERY.FEED, {
    pageParams: [GALLERY.FIRST_PAGE],
    pages: [FULL_PAGE],
  });
  return (
    <div className="@container" style={{ width }}>
      <HydrationBoundary state={dehydrate(client)}>
        <GalleryFeed canMark={false} source={GALLERY.SOURCE.GALLERY} />
      </HydrationBoundary>
    </div>
  );
};

const skeleton = (width: number) => (
  <div className="@container" style={{ width }}>
    <GalleryFeedSkeleton />
  </div>
);

/** What the page draws: its height, and how many columns its tiles stand in. */
const measure = async (width: number, view: React.ReactNode) => {
  const screen = await renderInApp({ children: view });
  await vi.waitFor(() => {
    if (
      screen.container.querySelectorAll("li").length !== GALLERY.SKELETON.TILES
    ) {
      throw new Error("the tiles are not all drawn");
    }
  });
  const box = screen.container.firstElementChild?.getBoundingClientRect();
  const columns = new Set(
    [...screen.container.querySelectorAll("li")].map((cell) => cell.offsetLeft)
  ).size;
  await screen.unmount();
  return { columns, height: box?.height ?? 0, width };
};

beforeEach(() => {
  // The next page never answers: the feed keeps its "more photos" button in view.
  worker.use(http.get(GALLERY_URL, () => new Promise(() => undefined)));
});

describe("GalleryFeedSkeleton", () => {
  it.each(WIDTHS)(
    "is as tall as the loaded feed on %s, so nothing moves when it arrives",
    async (_, width) => {
      const loaded = await measure(width, real(width));
      const waiting = await measure(width, skeleton(width));
      expect(waiting.height).toBeCloseTo(loaded.height, 0);
    }
  );

  it.each(WIDTHS)(
    "draws as many columns as the feed on %s",
    async (_, width) => {
      const loaded = await measure(width, real(width));
      const waiting = await measure(width, skeleton(width));
      expect(waiting.columns).toBe(loaded.columns);
    }
  );

  it("says it is loading without its parts being read", async () => {
    await renderInApp({ children: skeleton(900) });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(enT("Gallery.loading"));
    expect(document.querySelector('[data-skeleton="gallery"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
    expect(document.querySelector("ul")).toHaveAttribute("aria-hidden", "true");
  });
});
