import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { MUTATION } from "@/shared/constants/mutation";
import type { GalleryItem } from "../utils/feed-patch";

/**
 * What an open preview does when its photo leaves the data. The visitor's own
 * unmark (clearing a Favorite in the Favorites) lands on the photo that took
 * its place, or closes when none is left; a read that dropped the photo
 * closes with a notice.
 */
export const usePhotoGone = ({
  current,
  index,
  onOpenIdChange,
  openId,
  photos,
}: {
  current: GalleryItem | undefined;
  index: number;
  onOpenIdChange: (id: string | null) => void;
  openId: string | null;
  photos: readonly GalleryItem[];
}) => {
  const t = useTranslations("Gallery");
  const client = useQueryClient();
  const lastIndex = useRef(0);
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = openId === null ? 0 : Date.now();
  }, [openId]);
  useEffect(() => {
    if (current !== undefined) {
      lastIndex.current = index;
    }
  }, [current, index]);
  useEffect(() => {
    if (openId === null || current !== undefined) {
      return;
    }
    // The write can have settled already: any unmark sent since this photo opened counts.
    const ownChange = client
      .getMutationCache()
      .findAll({ mutationKey: MUTATION.GALLERY.FAVORITE(openId) })
      .some(
        ({ state }) =>
          state.variables === false && state.submittedAt >= openedAt.current
      );
    if (ownChange) {
      onOpenIdChange(
        photos[Math.min(lastIndex.current, photos.length - 1)]?.id ?? null
      );
      return;
    }
    onOpenIdChange(null);
    aofToast(t("preview.gone"), "info");
  }, [client, current, onOpenIdChange, openId, photos, t]);
};
