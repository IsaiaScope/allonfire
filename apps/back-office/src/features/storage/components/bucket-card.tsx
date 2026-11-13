import { STORAGE_USAGE } from "@allonfire/api/features/storage-usage/constants/storage-usage";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import {
  AOFCardAction,
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CardFrame } from "@/shared/components/card-frame";
import { OverviewTitle } from "@/shared/components/overview-card-state";
import { cardBadge } from "@/shared/utils/card-badge";
import { BUCKET_VIEW } from "../constants/buckets";
import type {
  StorageAvatars,
  StorageBucket,
  StorageImages,
} from "../utils/storage-overview-queries";
import { ImageBucketBody } from "./image-bucket-details";

/**
 * What a bucket's card adds to its totals, by what it holds (`kind`): what only that
 * bucket knows, drawn under them. It comes from the database, so the Images'
 * bytes stay when the bucket could not be listed.
 */
type BucketDetails = {
  body: (props: {
    avatars: StorageAvatars;
    images: StorageImages;
  }) => ReactNode;
};

const DETAILS = {
  [STORAGE_USAGE.BUCKET_KIND.IMAGE]: { body: ImageBucketBody },
} as const satisfies Record<StorageBucket["kind"], BucketDetails>;

/**
 * One bucket: titled by its name with its totals as badges at the header's right, each in its own colour, and whatever its details add. A bucket that could not be listed
 * says so; the rest of the card stays.
 */
export const BucketCard = ({
  avatars,
  bucket,
  images,
}: {
  avatars: StorageAvatars;
  bucket: StorageBucket;
  images: StorageImages;
}) => {
  const t = useTranslations("Storage");
  const { icon: Icon, kanji } = BUCKET_VIEW[bucket.kind];
  const details = DETAILS[bucket.kind];
  const { reading } = bucket;
  return (
    <CardFrame kanji={kanji}>
      <AOFCardHeader>
        <OverviewTitle
          icon={<Icon aria-hidden className="size-5" />}
          text={bucket.id}
        />
        <AOFCardAction className="flex flex-wrap items-center justify-end gap-2 self-center">
          {reading ? (
            <>
              <AOFBadge className={cardBadge({ tone: "chart1" })}>
                {t("badge.objects", { count: reading.objects })}
              </AOFBadge>
              <AOFBadge className={cardBadge({ tone: "chart2" })}>
                {t("badge.size", { size: formatSize(reading.bytes) })}
              </AOFBadge>
            </>
          ) : null}
        </AOFCardAction>
      </AOFCardHeader>
      <AOFCardContent className="flex flex-col gap-6">
        {reading ? null : (
          <p className="text-muted-foreground text-sm" role="status">
            {t("error.bucket")}
          </p>
        )}
        {details.body({ avatars, images })}
      </AOFCardContent>
    </CardFrame>
  );
};
