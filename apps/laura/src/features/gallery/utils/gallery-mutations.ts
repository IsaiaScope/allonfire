import {
  invalidateAll,
  optimisticMutation,
} from "@allonfire/core/features/next/query/utils/optimistic-mutation";
import { optimisticUpdate } from "@allonfire/core/features/next/query/utils/optimistic-update";
import type { QueryClient } from "@tanstack/react-query";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import { setFavorite } from "../actions/favorite";
import { removePhoto } from "../actions/remove-photo";
import { withFavorite, withoutPhoto } from "./feed-patch";
import type { GalleryFeed } from "./gallery-queries";

/** The reads a photo change moves: both feeds, which share one prefix. */
const GALLERY_MOVED = [QUERY.GALLERY.ALL] as const;

/**
 * One photo's cached feeds patched by `inGallery` and `inFavorites`, with one
 * rollback for both. A patch that changes nothing is the identity.
 */
const patchBoth = async (
  queryClient: QueryClient,
  inGallery: (feed: GalleryFeed) => GalleryFeed,
  inFavorites: (feed: GalleryFeed) => GalleryFeed
) => {
  const [undoGallery, undoFavorites] = await Promise.all([
    optimisticUpdate<GalleryFeed>(queryClient, QUERY.GALLERY.FEED, inGallery),
    optimisticUpdate<GalleryFeed>(
      queryClient,
      QUERY.FAVORITES.FEED,
      inFavorites
    ),
  ]);
  return () => {
    undoGallery();
    undoFavorites();
  };
};

/**
 * Marks (`true`) or clears (`false`) one photo as a Favorite through the
 * `setFavorite` action, after showing it: the flag changes in the Gallery
 * feed, and a cleared photo leaves the Favorites feed at once. A refusal
 * (`null`) puts both back and reads both feeds again. Once saved, a feed on
 * screen that the patch made exact is not read again (that is one request per
 * loaded page); a feed off screen is dropped, and a Favorites feed on screen
 * is read when a photo joins it. Two changes to one photo run one after the
 * other (`scope`).
 */
export const favoriteMutation = (imageId: string) =>
  optimisticMutation({
    action: (favorite: boolean) => setFavorite(imageId, favorite),
    invalidates: GALLERY_MOVED,
    // The patch is exact for the Gallery, and for the Favorites when a photo
    // leaves them; a photo joining them has no place in the loaded pages.
    keeps: (favorite) =>
      favorite
        ? [QUERY.GALLERY.FEED]
        : [QUERY.GALLERY.FEED, QUERY.FAVORITES.FEED],
    mutationKey: MUTATION.GALLERY.FAVORITE(imageId),
    patchCache: (queryClient, favorite) =>
      patchBoth(
        queryClient,
        (feed) => withFavorite(feed, imageId, favorite),
        (feed) => (favorite ? feed : withoutPhoto(feed, imageId))
      ),
    scope: MUTATION.GALLERY.FAVORITE(imageId).join("."),
  });

/**
 * Takes one photo out of Laura through the `removePhoto` action, after taking
 * it out of both feeds (a feed on screen is not read again once saved); a
 * refusal (`null`) puts it back and reads both again. 0 removed (another
 * Admin got there first) is a success.
 */
export const removePhotoMutation = optimisticMutation({
  action: async (imageId: string) => {
    const removed = await removePhoto(imageId);
    return removed === null ? null : { removed };
  },
  invalidates: GALLERY_MOVED,
  // Both feeds lose the photo exactly: nothing on screen needs reading again.
  keeps: () => [QUERY.GALLERY.FEED, QUERY.FAVORITES.FEED],
  mutationKey: MUTATION.GALLERY.REMOVE,
  patchCache: (queryClient, imageId) =>
    patchBoth(
      queryClient,
      (feed) => withoutPhoto(feed, imageId),
      (feed) => withoutPhoto(feed, imageId)
    ),
});

/**
 * Reads the Gallery and the Favorites again in this browser, after an Image
 * was added or removed (the action cleared the server's copies). Phase 5's
 * upload calls it.
 * @internal Read by Phase 5's upload, not yet written, and by this file's tests.
 */
export const invalidateGallery = (queryClient: QueryClient) =>
  invalidateAll(queryClient, GALLERY_MOVED);
