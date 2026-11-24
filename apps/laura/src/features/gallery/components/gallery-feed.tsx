"use client";

import { useAOFAltLanguage } from "@allonfire/ui/features/image/hooks/use-aof-alt-language";
import { AOFInfiniteSentinel } from "@allonfire/ui/features/query/components/aof-infinite-sentinel";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { IconLoader2, IconPhotoPlus, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { COMPACT_ACTION } from "@/shared/constants/action-dressing";
import { GALLERY, type GallerySource } from "../constants/gallery";
import { useGalleryFeed } from "../hooks/use-gallery-feed";
import { GalleryNotice } from "./gallery-notice";
import { GalleryFeedSkeleton } from "./gallery-skeleton";
import { feedFrame, PhotoGrid } from "./photo-grid";
import { PhotoPreview } from "./photo-preview";
import { PhotoTile } from "./photo-tile";

export type GalleryFeedProps = {
  /** An Admin: the heart sets a Favorite and the preview removes a photo; a User only sees them. */
  canMark: boolean;
  source: GallerySource;
};

/**
 * Every photo of a list, page after page, in one grid (no seam where a page
 * ends). The first page arrives with the page; the next is asked for when the
 * grid's end nears the screen, or by the button beside it. A first page still
 * on its way shows the skeleton; a first load that failed or an empty list
 * shows its notice; a later page that fails keeps the photos and offers a retry.
 */
export const GalleryFeed = ({ canMark, source }: GalleryFeedProps) => {
  const t = useTranslations(
    source === GALLERY.SOURCE.FAVORITES ? "Favorites" : "Gallery"
  );
  const more = useTranslations("Gallery.more");
  const language = useAOFAltLanguage();
  const { photos, query } = useGalleryFeed(source);
  const [openId, setOpenId] = useState<string | null>(null);
  const { fetchNextPage, hasNextPage, isFetchNextPageError, refetch } = query;
  const fetchMore = useCallback(() => {
    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage]);
  const retryFirst = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  if (query.data === undefined) {
    return query.isError ? (
      <GalleryNotice
        canMark={canMark}
        kind="error"
        onRetry={retryFirst}
        source={source}
      />
    ) : (
      <GalleryFeedSkeleton />
    );
  }
  if (photos.length === 0 && !hasNextPage) {
    return (
      <GalleryNotice
        canMark={canMark}
        kind="empty"
        onRetry={retryFirst}
        source={source}
      />
    );
  }
  const waiting = query.isFetchingNextPage;
  // One rule for every way of asking: a next page exists and none is on its way or failed.
  const canFetchMore =
    Boolean(hasNextPage) && !waiting && !isFetchNextPageError;
  return (
    <div className={feedFrame()}>
      <PhotoGrid aria-label={t("list")}>
        {photos.map((image, index) => (
          <PhotoTile
            canMark={canMark}
            image={image}
            key={image.id}
            language={language}
            lcp={index === 0}
            onOpen={setOpenId}
          />
        ))}
      </PhotoGrid>
      <AOFInfiniteSentinel
        disabled={!canFetchMore}
        onReach={fetchMore}
        // About a phone screen ahead of the end: the next photos are on their way before the grid runs out. The observer takes px or %, never rem.
        rootMargin="800px"
      />
      <p className="sr-only" role="status">
        {waiting ? more("loading") : ""}
      </p>
      {isFetchNextPageError ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-bold text-destructive text-sm" role="alert">
            {more("failed")}
          </p>
          <AOFButton className={COMPACT_ACTION.className} onClick={fetchMore}>
            {COMPACT_ACTION.marks.retry}
            <IconRefresh aria-hidden />
            {more("retry")}
          </AOFButton>
        </div>
      ) : null}
      <PhotoPreview
        canFetchMore={canFetchMore}
        canMark={canMark}
        fetchNextPage={fetchMore}
        language={language}
        onOpenIdChange={setOpenId}
        openId={openId}
        photos={photos}
      />
      {hasNextPage && !isFetchNextPageError ? (
        <div className="flex justify-center">
          <AOFButton
            aria-busy={waiting}
            className={COMPACT_ACTION.className}
            disabled={waiting}
            onClick={fetchMore}
          >
            {COMPACT_ACTION.marks.retry}
            {waiting ? (
              <IconLoader2 aria-hidden className="motion-safe:animate-spin" />
            ) : (
              <IconPhotoPlus aria-hidden />
            )}
            {waiting ? more("loading") : more("load")}
          </AOFButton>
        </div>
      ) : null}
    </div>
  );
};
