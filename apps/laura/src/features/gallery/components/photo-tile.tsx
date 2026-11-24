"use client";

import type { HostLanguage } from "@allonfire/core/features/i18n/constants/locales";
import { aofAltFor } from "@allonfire/ui/features/image/utils/alt-for";
import { AOFStorageImage } from "@allonfire/ui/shared/components/aof-image";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import { type ComponentProps, useCallback } from "react";
import type { GalleryItem } from "../utils/feed-patch";
import { FavoriteControl } from "./favorite-control";
import { PhotoCell } from "./photo-grid";

export type PhotoTileProps = Omit<ComponentProps<"li">, "children"> & {
  /** An Admin sets the heart; a User sees the mark of a Favorite only. */
  canMark: boolean;
  image: GalleryItem;
  language: HostLanguage;
  /** The page's largest picture: the first tile only. */
  lcp?: boolean;
  onOpen: (id: string) => void;
};

/**
 * One photo in the grid: a button over the picture, its blur under it until it
 * loads. The picture fills the cell the grid sized from its ratio
 * (`object-cover` hides the rounding), so nothing moves when it arrives. The
 * button is named by the alt in the page's language.
 */
export const PhotoTile = ({
  canMark,
  className,
  image,
  language,
  lcp = false,
  onOpen,
  ...props
}: PhotoTileProps) => {
  const t = useTranslations("Gallery");
  const alt = aofAltFor(image.alt, language);
  const open = useCallback(() => onOpen(image.id), [image.id, onOpen]);
  return (
    <PhotoCell
      className={cn("group relative p-1", className)}
      height={image.height}
      width={image.width}
      {...props}
    >
      <button
        aria-label={alt === "" ? t("photo.open") : alt}
        className="relative size-full cursor-pointer overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={open}
        type="button"
      >
        <AOFStorageImage
          className="size-full object-cover"
          image={image}
          language={language}
          lcp={lcp}
          placeholder="blur"
          // The grid's columns, as fractions of the page: four, three, two, one.
          sizes="(min-width: 60rem) 25vw, (min-width: 40rem) 33vw, (min-width: 22rem) 50vw, 100vw"
        />
      </button>
      <FavoriteControl
        canMark={canMark}
        className={cn(
          "absolute right-1.5 bottom-1.5",
          image.favorite
            ? ""
            : "opacity-0 pointer-coarse:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
        )}
        favorite={image.favorite}
        imageId={image.id}
      />
    </PhotoCell>
  );
};
