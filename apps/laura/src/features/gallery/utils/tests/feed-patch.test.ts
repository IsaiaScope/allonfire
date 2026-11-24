// @module-tag unit

import { GALLERY_PAGE, GALLERY_PAGE_TWO } from "@/shared/tests/msw/handlers";
import { photosOf, withFavorite, withoutPhoto } from "../feed-patch";
import type { GalleryFeed } from "../gallery-queries";

const FEED: GalleryFeed = {
  pageParams: [null, GALLERY_PAGE.nextCursor],
  pages: [GALLERY_PAGE, GALLERY_PAGE_TWO],
};

const flagsOf = (feed: GalleryFeed) =>
  feed.pages.flatMap((page) =>
    page.items.map(({ favorite, id }) => `${id}:${favorite}`)
  );

describe("withFavorite", () => {
  it("sets the flag on that photo across pages and touches no other", () => {
    expect(flagsOf(withFavorite(FEED, "photo-d", true))).toEqual([
      "photo-a:true",
      "photo-b:false",
      "photo-c:false",
      "photo-d:true",
      "photo-e:false",
    ]);
    expect(flagsOf(withFavorite(FEED, "photo-a", false))[0]).toBe(
      "photo-a:false"
    );
  });

  it("keeps the page params and each page's cursor, and leaves the feed it was given alone", () => {
    const next = withFavorite(FEED, "photo-b", true);
    expect(next.pageParams).toEqual(FEED.pageParams);
    expect(next.pages.map((page) => page.nextCursor)).toEqual([
      GALLERY_PAGE.nextCursor,
      null,
    ]);
    expect(flagsOf(FEED)[1]).toBe("photo-b:false");
  });

  it("returns an equal feed for a photo that is not there", () => {
    expect(withFavorite(FEED, "missing", true)).toEqual(FEED);
  });
});

describe("withoutPhoto", () => {
  it("removes the photo and keeps every other, in order", () => {
    expect(flagsOf(withoutPhoto(FEED, "photo-b"))).toEqual([
      "photo-a:true",
      "photo-c:false",
      "photo-d:false",
      "photo-e:false",
    ]);
  });

  it("keeps the page params, and the cursor of a page it empties so the next page is still asked for", () => {
    const single: GalleryFeed = {
      pageParams: [null],
      pages: [{ items: GALLERY_PAGE.items.slice(0, 1), nextCursor: "c1" }],
    };
    const next = withoutPhoto(single, "photo-a");
    expect(next.pageParams).toEqual([null]);
    expect(next.pages).toEqual([{ items: [], nextCursor: "c1" }]);
  });

  it("returns an equal feed for a photo that is not there", () => {
    expect(withoutPhoto(FEED, "missing")).toEqual(FEED);
  });
});

describe("photosOf", () => {
  it("lists every loaded photo in feed order", () => {
    expect(photosOf(FEED).map(({ id }) => id)).toEqual([
      "photo-a",
      "photo-b",
      "photo-c",
      "photo-d",
      "photo-e",
    ]);
  });

  it("is empty before anything is loaded", () => {
    expect(photosOf(undefined)).toEqual([]);
  });
});
