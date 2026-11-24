"use client";

import { useAOFLinkRefresh } from "@allonfire/ui/features/query/hooks/use-aof-link-refresh";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { GALLERY, type GallerySource } from "../constants/gallery";
import { photosOf } from "../utils/feed-patch";
import { feedQueryFor } from "../utils/gallery-queries";

/**
 * The feed a source reads (hydrated with its first page by the page), the
 * photos of every page loaded so far, and the links kept fresh on a page left
 * open: the whole Gallery's, the Favorites' too.
 */
export const useGalleryFeed = (source: GallerySource) => {
  const query = useInfiniteQuery(feedQueryFor(source, api));
  useAOFLinkRefresh({
    queryKey: QUERY.GALLERY.ALL,
    refreshMs: GALLERY.LINK_REFRESH_MS,
  });
  return { photos: photosOf(query.data), query };
};
