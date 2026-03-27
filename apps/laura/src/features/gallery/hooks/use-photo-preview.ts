"use client";

import { useCallback, useState } from "react";

type Photo = {
  id: string;
  url: string;
  width: number;
  height: number;
};

export function usePhotoPreview() {
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);

  const openPreview = useCallback((photo: Photo) => {
    setCurrentPhoto(photo);
  }, []);

  const closePreview = useCallback(() => {
    setCurrentPhoto(null);
  }, []);

  return { currentPhoto, openPreview, closePreview, isOpen: !!currentPhoto };
}
