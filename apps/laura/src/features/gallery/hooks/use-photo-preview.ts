"use client";

import { useCallback, useState } from "react";

type Photo = {
  id: string;
  url: string;
  thumbnailUrl: string;
  blurDataURL: string;
  width: number;
  height: number;
  isFavorite: boolean;
};

export function usePhotoPreview() {
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);

  const openPreview = useCallback((photo: Photo) => {
    setCurrentPhoto(photo);
  }, []);

  const closePreview = useCallback(() => {
    setCurrentPhoto(null);
  }, []);

  return { currentPhoto, openPreview, closePreview };
}
