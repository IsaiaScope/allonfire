"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GalleryPage } from "@/features/gallery/actions/gallery";
import { deletePhotoAction } from "@/features/gallery/actions/gallery";
import { useFavoriteToggle } from "@/features/gallery/hooks/use-favorite-toggle";
import { usePhotoPreview } from "@/features/gallery/hooks/use-photo-preview";
import { SCROLL_CONTAINER_SELECTOR } from "@/features/layout/constants";

type UseInfiniteGalleryOptions = {
  queryKey: string[];
  queryFn: (cursor?: string) => Promise<GalleryPage>;
  initialData: GalleryPage;
};

export function useInfiniteGallery({
  queryKey,
  queryFn,
  initialData,
}: UseInfiniteGalleryOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { currentPhoto, openPreview, closePreview } = usePhotoPreview();
  const favoriteMutation = useFavoriteToggle();

  const handleDelete = useCallback(
    async (photoId: string) => {
      closePreview();
      await deletePhotoAction(photoId);
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    [closePreview, queryClient]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => queryFn(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData: {
        pages: [initialData],
        pageParams: [undefined],
      },
    });

  const canFetchRef = useRef(false);
  canFetchRef.current = hasNextPage && !isFetchingNextPage;

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && canFetchRef.current) {
        fetchNextPage();
      }
    },
    [fetchNextPage]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const scrollContainer = document.querySelector(SCROLL_CONTAINER_SELECTOR);
    const observer = new IntersectionObserver(handleIntersect, {
      root: scrollContainer,
      rootMargin: "200px",
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [handleIntersect]);

  const allPhotos = useMemo(
    () => data?.pages.flatMap((page) => page.photos) ?? [],
    [data?.pages]
  );

  const previewPhoto = useMemo(
    () =>
      currentPhoto
        ? {
            ...currentPhoto,
            isFavorite:
              allPhotos.find((p) => p.id === currentPhoto.id)?.isFavorite ??
              currentPhoto.isFavorite,
          }
        : null,
    [currentPhoto, allPhotos]
  );

  const toggleFavorite = useCallback(
    (photoId: string) => favoriteMutation.mutate(photoId),
    [favoriteMutation.mutate]
  );

  return {
    allPhotos,
    sentinelRef,
    isFetchingNextPage,
    currentPhoto,
    previewPhoto,
    openPreview,
    closePreview,
    handleDelete,
    toggleFavorite,
  };
}
