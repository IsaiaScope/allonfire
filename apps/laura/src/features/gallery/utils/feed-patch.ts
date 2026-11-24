import type { GalleryFeed, GalleryPage } from "./gallery-queries";

/** One photo as the lists answer it. */
export type GalleryItem = GalleryPage["items"][number];

/** The feed with each page's photos changed by `change`; every other field and the page params stay. */
const mapItems = (
  feed: GalleryFeed,
  change: (items: GalleryItem[]) => GalleryItem[]
): GalleryFeed => ({
  ...feed,
  pages: feed.pages.map((page) => ({ ...page, items: change(page.items) })),
});

/** The feed with one photo's Favorite flag set: what a tap shows before the API answers. */
export const withFavorite = (
  feed: GalleryFeed,
  id: string,
  favorite: boolean
) =>
  mapItems(feed, (items) =>
    items.map((item) => (item.id === id ? { ...item, favorite } : item))
  );

/**
 * The feed without one photo. A page it leaves empty keeps its `nextCursor`,
 * so a later page is still asked for.
 */
export const withoutPhoto = (feed: GalleryFeed, id: string) =>
  mapItems(feed, (items) => items.filter((item) => item.id !== id));

/** Every loaded photo in feed order: what the preview steps through. */
export const photosOf = (
  feed: Pick<GalleryFeed, "pages"> | undefined
): GalleryItem[] => feed?.pages.flatMap((page) => page.items) ?? [];
