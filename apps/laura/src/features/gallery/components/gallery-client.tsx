"use client";

import { useTranslations } from "next-intl";
import type { GalleryPage } from "@/features/gallery/actions/gallery";
import { getPhotosAction } from "@/features/gallery/actions/gallery";
import { GalleryEmpty } from "./gallery-empty";
import { PhotoGalleryView } from "./photo-gallery-view";

type GalleryClientProps = {
  initialData: GalleryPage;
};

export function GalleryClient({ initialData }: GalleryClientProps) {
  const t = useTranslations("Gallery");

  return (
    <PhotoGalleryView
      emptyState={<GalleryEmpty />}
      initialData={initialData}
      loadingMessage={t("loadingMemories")}
      queryFn={getPhotosAction}
      queryKey={["photos"]}
    />
  );
}
