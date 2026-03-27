"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GalleryPage } from "@/features/gallery/actions/gallery";
import { getPhotosAction } from "@/features/gallery/actions/gallery";
import { usePhotoPreview } from "@/features/gallery/hooks/use-photo-preview";
import { GalleryEmpty } from "./gallery-empty";
import { PhotoCard } from "./photo-card";
import { PhotoPreview } from "./photo-preview";

type GalleryClientProps = {
  initialData: GalleryPage;
};

export function GalleryClient({ initialData }: GalleryClientProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { currentPhoto, openPreview, closePreview } = usePhotoPreview();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["photos"],
      queryFn: ({ pageParam }) => getPhotosAction(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData: {
        pages: [initialData],
        pageParams: [undefined],
      },
    });

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [handleIntersect]);

  const allPhotos = useMemo(
    () => data?.pages.flatMap((page) => page.photos) ?? [],
    [data?.pages]
  );

  if (allPhotos.length === 0) {
    return <GalleryEmpty />;
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {allPhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            onClick={() => openPreview(photo)}
            photo={photo}
          />
        ))}
      </div>

      <div className="py-8 text-center" ref={sentinelRef}>
        {isFetchingNextPage && (
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        )}
        {!hasNextPage && allPhotos.length > 0 && (
          <p className="text-muted-foreground text-sm">All photos loaded</p>
        )}
      </div>

      {currentPhoto && (
        <PhotoPreview onClose={closePreview} photo={currentPhoto} />
      )}
    </>
  );
}
