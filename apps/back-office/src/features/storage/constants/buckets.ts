import { STORAGE_USAGE } from "@allonfire/api/features/storage-usage/constants/storage-usage";
import type { ValueOf } from "@allonfire/core/shared/utils/object";
import { IconPhoto, type TablerIcon } from "@tabler/icons-react";
import { STORAGE } from "./storage";

/** How the Back Office draws one bucket's card. */
export type BucketView = {
  icon: TablerIcon;
  /** Brushed large and faint behind the card. */
  kanji: string;
};

/**
 * The cards the overview knows, by what the bucket holds (`kind`, which the
 * API names: the bucket's own name is configured, so it cannot say). A new
 * kind is an entry here and in `DETAILS`, plus a line in the API's list of
 * buckets.
 */
export const BUCKET_VIEW = {
  /** Images and Avatars share the bucket. 写, a photograph. */
  [STORAGE_USAGE.BUCKET_KIND.IMAGE]: {
    icon: IconPhoto,
    kanji: STORAGE.KANJI.IMAGE,
  },
} as const satisfies Record<
  ValueOf<typeof STORAGE_USAGE.BUCKET_KIND>,
  BucketView
>;
