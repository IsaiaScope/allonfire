"use client";

import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { OceanNotice } from "@/features/errors/components/ocean-notice-frame";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";
import { MASCOT } from "@/shared/constants/mascots";
import { GALLERY } from "../constants/gallery";
import type { GallerySource } from "../constants/gallery-schema";

export type GalleryNoticeProps = {
  /** An Admin's empty words point to Upload (or the heart); a User's say what will come. */
  canMark: boolean;
  kind: "empty" | "error";
  onRetry: () => void;
  source: GallerySource;
};

/**
 * What the feed shows where the photos stand when it has none to show, drawn
 * as the App's other notices are, each moment with its own picture of the sea
 * (`MASCOT.GALLERY`): nothing there yet, in the words of its source, or the
 * first load failed (ask again; never a toast: nothing else is on screen).
 */
export const GalleryNotice = ({
  canMark,
  kind,
  onRetry,
  source,
}: GalleryNoticeProps) => {
  const gallery = useTranslations("Gallery");
  const favorites = useTranslations("Favorites");
  if (kind === "error") {
    return (
      <OceanNotice
        action={
          <AOFButton
            className={ACTION_DRESSING.className}
            onClick={onRetry}
            size="field"
          >
            {ACTION_DRESSING.marks.retry}
            <IconRefresh aria-hidden />
            {gallery("error.retry")}
          </AOFButton>
        }
        art={MASCOT.ERROR}
        description={gallery("error.description")}
        heading={gallery("error.title")}
        scope="part"
      />
    );
  }
  const ofFavorites = source === GALLERY.SOURCE.FAVORITES;
  const t = ofFavorites ? favorites : gallery;
  return (
    <OceanNotice
      art={ofFavorites ? MASCOT.GALLERY.FAVORITES_EMPTY : MASCOT.GALLERY.EMPTY}
      description={canMark ? t("empty.admin") : t("empty.description")}
      heading={t("empty.title")}
      scope="part"
    />
  );
};
