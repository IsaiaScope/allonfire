"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { OverviewQueryView } from "@/shared/components/overview-query-view";
import { STORAGE } from "../constants/storage";
import { storageOverviewQuery } from "../utils/storage-overview-queries";
import { BucketCard } from "./bucket-card";
import { StorageOverviewSkeleton } from "./storage-overview-skeleton";

/**
 * The Storage overview on Home, read back from the page's hydration under
 * the same key and asked again only when an Image change refreshed it. Every
 * Image change clears the private cache (`updateTag`) and this view
 * (`QUERY.STORAGE.ALL`). Its states are an `OverviewQueryView`'s, each a card of the same size.
 */
export const StorageOverview = () => {
  const t = useTranslations("Storage");
  const overview = useQuery(storageOverviewQuery(api));
  // The buckets are only known once they are read, so the card has no title.
  const card = {
    height: STORAGE.OVERVIEW.CHART_HEIGHT_PX,
    kanji: STORAGE.KANJI.IMAGE,
  };
  return (
    <OverviewQueryView
      card={card}
      query={overview}
      skeleton={<StorageOverviewSkeleton />}
      words={{
        failed: t("error.view"),
        forbidden: t("error.forbidden"),
        retry: t("error.retry"),
      }}
    >
      {({ avatars, buckets, images }) => (
        <div className="flex flex-col gap-6">
          {buckets.map((bucket) => (
            <BucketCard
              avatars={avatars}
              bucket={bucket}
              images={images}
              key={bucket.id}
            />
          ))}
        </div>
      )}
    </OverviewQueryView>
  );
};
