"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  type GalleryPage,
  toggleFavoriteAction,
} from "@/features/gallery/actions/gallery";

type CachedGalleryData = InfiniteData<GalleryPage>;

function updatePhotoInPages(
  data: CachedGalleryData,
  photoId: string,
  isFavorite: boolean
): CachedGalleryData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      photos: page.photos.map((photo) =>
        photo.id === photoId ? { ...photo, isFavorite } : photo
      ),
    })),
  };
}

function removePhotoFromPages(
  data: CachedGalleryData,
  photoId: string
): CachedGalleryData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      photos: page.photos.filter((photo) => photo.id !== photoId),
    })),
  };
}

export function useFavoriteToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavoriteAction,
    onMutate: async (photoId: string) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["photos"] }),
        queryClient.cancelQueries({ queryKey: ["favorites"] }),
      ]);

      const previousPhotos = queryClient.getQueryData<CachedGalleryData>([
        "photos",
      ]);
      const previousFavorites = queryClient.getQueryData<CachedGalleryData>([
        "favorites",
      ]);

      // Determine current favorite state from the photos cache
      const currentPhoto = previousPhotos?.pages
        .flatMap((p) => p.photos)
        .find((p) => p.id === photoId);
      const willBeFavorite = !currentPhoto?.isFavorite;

      // Update the main gallery cache
      if (previousPhotos) {
        queryClient.setQueryData<CachedGalleryData>(
          ["photos"],
          updatePhotoInPages(previousPhotos, photoId, willBeFavorite)
        );
      }

      // Update the favorites cache
      if (previousFavorites) {
        if (willBeFavorite && currentPhoto) {
          // Photo is being added — it will appear on next refetch
        } else {
          // Photo is being removed from favorites
          queryClient.setQueryData<CachedGalleryData>(
            ["favorites"],
            removePhotoFromPages(previousFavorites, photoId)
          );
        }
      }

      return { previousPhotos, previousFavorites };
    },
    onError: (_err, _photoId, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(["photos"], context.previousPhotos);
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favorites"], context.previousFavorites);
      }
    },
    onSettled: () => {
      // Only invalidate favorites — the photos cache is already correct
      // from the optimistic update in onMutate. Invalidating ["photos"]
      // would refetch every loaded page of the infinite query.
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
