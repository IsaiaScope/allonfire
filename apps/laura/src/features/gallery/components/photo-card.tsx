"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { GalleryPhoto } from "@/features/gallery/actions/gallery";
import { useHeartAnimation } from "@/features/gallery/hooks/use-heart-animation";

type PhotoCardProps = {
  photo: GalleryPhoto;
  onClick: () => void;
  onFavoriteToggle?: () => void;
};

export function PhotoCard({
  photo,
  onClick,
  onFavoriteToggle,
}: PhotoCardProps) {
  const aspectRatio = photo.height / photo.width;
  const t = useTranslations("Favorites");
  const { animating, trigger: triggerHeartAnimation } = useHeartAnimation();

  const triggerFavorite = useCallback(() => {
    if (!onFavoriteToggle) {
      return;
    }
    if (!photo.isFavorite) {
      triggerHeartAnimation();
    }
    onFavoriteToggle();
  }, [onFavoriteToggle, photo.isFavorite, triggerHeartAnimation]);

  const handleHeartClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      triggerFavorite();
    },
    [triggerFavorite]
  );

  return (
    <button
      className="group relative block w-full cursor-pointer overflow-hidden rounded-lg transition-all duration-200 hover:shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_25%,transparent)] hover:ring-1 hover:ring-white/10 focus-visible:outline-2 focus-visible:outline-primary"
      onClick={onClick}
      type="button"
    >
      <Image
        alt={photo.caption ?? ""}
        blurDataURL={photo.blurDataURL}
        className="w-full rounded-lg transition-transform duration-200 hover:scale-[1.02]"
        height={Math.round(400 * aspectRatio)}
        placeholder="blur"
        src={photo.thumbnailUrl}
        width={400}
      />
      {onFavoriteToggle && (
        <>
          {photo.isFavorite && (
            <Heart className="absolute top-1.5 right-1.5 h-3.5 w-3.5 fill-red-500/85 text-red-900/50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] group-hover:hidden lg:top-2 lg:right-2 lg:h-5 lg:w-5" />
          )}
          <button
            aria-label={
              photo.isFavorite ? t("removeFromFavorites") : t("addToFavorites")
            }
            className={`absolute top-1.5 right-1.5 hidden cursor-pointer group-hover:block lg:top-2 lg:right-2 ${
              photo.isFavorite
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            } transition-opacity duration-200`}
            onClick={handleHeartClick}
            tabIndex={-1}
            type="button"
          >
            <Heart
              className={`h-3.5 w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-transform duration-150 hover:scale-125 lg:h-5 lg:w-5 ${
                photo.isFavorite
                  ? "fill-red-500/85 text-red-900/50"
                  : "fill-transparent stroke-[2.5] text-white/80"
              }`}
            />
          </button>
          {animating && (
            <span className="pointer-events-none absolute top-1.5 right-1.5 flex items-center justify-center lg:top-2 lg:right-2">
              <Heart className="h-3.5 w-3.5 animate-heart-burst fill-red-500/85 text-red-900/50 lg:h-5 lg:w-5" />
              <span className="absolute h-6 w-6 animate-heart-ring rounded-full border-2 border-red-500/55 lg:h-8 lg:w-8" />
            </span>
          )}
        </>
      )}
    </button>
  );
}
