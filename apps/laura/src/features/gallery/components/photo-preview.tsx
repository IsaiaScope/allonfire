"use client";

import type { HostLanguage } from "@allonfire/core/features/i18n/constants/locales";
import { aofErrorMeta } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { AOFLightbox } from "@allonfire/ui/features/image/components/aof-lightbox";
import { aofAltFor } from "@allonfire/ui/features/image/utils/alt-for";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OceanAlert } from "@/shared/components/ocean-alert";
import { OceanArt } from "@/shared/components/ocean-art";
import { MASCOT } from "@/shared/constants/mascots";
import { GALLERY } from "../constants/gallery";
import { usePhotoGone } from "../hooks/use-photo-gone";
import type { GalleryItem } from "../utils/feed-patch";
import { removePhotoMutation } from "../utils/gallery-mutations";
import { FavoriteControl } from "./favorite-control";
import { PreviewPicture } from "./preview-picture";

/** The toolbar's own controls: the heart, and for an Admin Remove (it only asks: the confirm acts). */
const PreviewActions = ({
  canMark,
  onRemove,
  photo,
}: {
  canMark: boolean;
  onRemove: () => void;
  photo: GalleryItem;
}) => {
  const t = useTranslations("Gallery.remove");
  return (
    <>
      <FavoriteControl
        canMark={canMark}
        favorite={photo.favorite}
        imageId={photo.id}
        key={photo.id}
        surface="bar"
      />
      {canMark ? (
        <AOFTooltip label={t("action")}>
          <AOFButton
            aria-label={t("action")}
            onClick={onRemove}
            size="icon"
            variant="ghost"
          >
            <IconTrash aria-hidden className="size-6" />
          </AOFButton>
        </AOFTooltip>
      ) : null}
    </>
  );
};

export type PhotoPreviewProps = {
  /** Another page can be asked for now (there is one, and none is loading). */
  canFetchMore: boolean;
  /** An Admin sets the heart and removes photos; a User sees the mark only. */
  canMark: boolean;
  fetchNextPage: () => void;
  language: HostLanguage;
  /** The open photo's id, or `null` while the preview is shut. Asked to change to step or close. */
  onOpenIdChange: (id: string | null) => void;
  openId: string | null;
  /** Every photo loaded, in feed order: what the preview steps through. */
  photos: readonly GalleryItem[];
};

/**
 * The full-screen preview of the photos the feed holds (`AOFLightbox`): the
 * photo large over its own blur, its caption in the page's language, the heart
 * and, for an Admin, Remove in the toolbar behind a confirm. It follows the
 * photo by its id, so a read that drops it closes the preview with a notice,
 * and Remove moves to the next photo (else the previous), closing when none is
 * left. Near the end of what is loaded it asks for the next page.
 */
export const PhotoPreview = ({
  canFetchMore,
  canMark,
  fetchNextPage,
  language,
  onOpenIdChange,
  openId,
  photos,
}: PhotoPreviewProps) => {
  const t = useTranslations("Gallery");
  const [asking, setAsking] = useState(false);
  const index = photos.findIndex(({ id }) => id === openId);
  const current = photos[index];
  const { isPending, mutate } = useMutation({
    ...removePhotoMutation,
    meta: aofErrorMeta(t("remove.failed")),
  });

  usePhotoGone({ current, index, onOpenIdChange, openId, photos });

  // Near the end of what is loaded, ask for more before the visitor gets there.
  useEffect(() => {
    if (
      current !== undefined &&
      canFetchMore &&
      index >= photos.length - GALLERY.LIMIT.PREFETCH_AHEAD
    ) {
      fetchNextPage();
    }
  }, [canFetchMore, current, fetchNextPage, index, photos.length]);

  const step = useCallback(
    (next: number) => {
      const photo = photos[next];
      if (photo) {
        onOpenIdChange(photo.id);
      }
    },
    [onOpenIdChange, photos]
  );
  const setOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        onOpenIdChange(null);
      }
    },
    [onOpenIdChange]
  );
  const ask = useCallback(() => setAsking(true), []);
  const remove = useCallback(() => {
    if (current === undefined) {
      return;
    }
    setAsking(false);
    // Land on the neighbour first, so the photo leaving the data is no loss.
    onOpenIdChange((photos[index + 1] ?? photos[index - 1])?.id ?? null);
    mutate(current.id);
  }, [current, index, mutate, onOpenIdChange, photos]);

  const renderSlide = useCallback(
    (at: number) => {
      const photo = photos[at];
      return photo ? (
        <PreviewPicture image={photo} language={language} lcp={at === index} />
      ) : null;
    },
    [index, language, photos]
  );
  const labels = useMemo(
    () => ({
      close: t("preview.close"),
      next: t("preview.next"),
      // The library fills `{index}` and `{total}` itself: the words go in raw.
      position: t.raw("preview.position"),
      previous: t("preview.previous"),
      title: t("preview.title"),
    }),
    [t]
  );
  const alt = current ? aofAltFor(current.alt, language) : "";
  const caption =
    alt === "" ? undefined : (
      <div className="flex min-w-0 max-w-full items-center gap-2.5 rounded-lg border border-border bg-card py-1.5 pr-4 pl-2.5 shadow-sm">
        <OceanArt art={MASCOT.CRUMB.gallery} className="size-7" />
        <p className="truncate font-heading text-lg leading-snug">{alt}</p>
      </div>
    );
  const actions = current ? (
    <PreviewActions canMark={canMark} onRemove={ask} photo={current} />
  ) : undefined;
  return (
    <>
      <AOFLightbox
        actions={actions}
        caption={caption}
        count={photos.length}
        index={Math.max(index, 0)}
        labels={labels}
        onIndexChange={step}
        onOpenChange={setOpen}
        open={current !== undefined}
        paused={asking}
        renderSlide={renderSlide}
      />
      <OceanAlert
        cancel={t("remove.cancel")}
        confirm={t("remove.confirm")}
        description={t("remove.description")}
        icon={<IconTrash aria-hidden />}
        onConfirm={remove}
        onOpenChange={setAsking}
        open={asking}
        pending={isPending}
        title={t("remove.title")}
      />
    </>
  );
};
