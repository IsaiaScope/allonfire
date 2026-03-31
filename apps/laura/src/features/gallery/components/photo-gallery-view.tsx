"use client";

import type { ReactNode } from "react";
import { useIsViewer } from "@/components/user-role-provider";
import type {
  GalleryPage,
  GalleryPhoto,
} from "@/features/gallery/actions/gallery";
import { useInfiniteGallery } from "@/features/gallery/hooks/use-infinite-gallery";
import { LoadingSpinner } from "./loading-spinner";
import { MasonryGrid } from "./masonry-grid";
import { PhotoCard } from "./photo-card";
import { PhotoPreview } from "./photo-preview";

const getPhotoHeight = (photo: GalleryPhoto) => photo.height / photo.width;
const getPhotoKey = (photo: GalleryPhoto) => photo.id;

type PhotoGalleryViewProps = {
  queryKey: string[];
  queryFn: (cursor?: string) => Promise<GalleryPage>;
  initialData: GalleryPage;
  loadingMessage: string;
  emptyState: ReactNode;
};

export function PhotoGalleryView({
  queryKey,
  queryFn,
  initialData,
  loadingMessage,
  emptyState,
}: PhotoGalleryViewProps) {
  const isViewer = useIsViewer();
  const {
    allPhotos,
    sentinelRef,
    isFetchingNextPage,
    currentPhoto,
    previewPhoto,
    openPreview,
    closePreview,
    handleDelete,
    toggleFavorite,
  } = useInfiniteGallery({ queryKey, queryFn, initialData });

  if (allPhotos.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div data-gallery>
      <MasonryGrid
        getItemHeight={getPhotoHeight}
        items={allPhotos}
        keyExtractor={getPhotoKey}
        renderItem={(photo) => (
          <PhotoCard
            disabled={isViewer}
            onClick={() => openPreview(photo)}
            onFavoriteToggle={() => toggleFavorite(photo.id)}
            photo={photo}
          />
        )}
      />

      <div className="py-6 text-center" ref={sentinelRef}>
        {isFetchingNextPage && <LoadingSpinner message={loadingMessage} />}
      </div>

      {currentPhoto && previewPhoto && (
        <PhotoPreview
          disabled={isViewer}
          onClose={closePreview}
          onDelete={() => handleDelete(currentPhoto.id)}
          onFavoriteToggle={() => toggleFavorite(currentPhoto.id)}
          photo={previewPhoto}
        />
      )}
    </div>
  );
}
