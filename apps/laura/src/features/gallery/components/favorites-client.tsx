"use client";

import { Button } from "@allonfire/ui/components/button";
import { Heart, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GalleryPage } from "@/features/gallery/actions/gallery";
import { getFavoritesAction } from "@/features/gallery/actions/gallery";
import { Link } from "@/i18n/navigation";
import { PhotoGalleryView } from "./photo-gallery-view";

type FavoritesClientProps = {
  initialData: GalleryPage;
};

export function FavoritesClient({ initialData }: FavoritesClientProps) {
  const t = useTranslations("Favorites");

  return (
    <PhotoGalleryView
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
          <Images className="size-16 text-muted-foreground/50" />
          <div className="text-center">
            <h2 className="font-semibold text-lg">{t("emptyTitle")}</h2>
            <p className="mt-1 text-muted-foreground">{t("emptySubtitle")}</p>
          </div>
          <Button asChild>
            <Link href="/">
              <Heart className="size-4" />
              {t("browseGallery")}
            </Link>
          </Button>
        </div>
      }
      initialData={initialData}
      loadingMessage={t("loadingMemories")}
      queryFn={getFavoritesAction}
      queryKey={["favorites"]}
    />
  );
}
