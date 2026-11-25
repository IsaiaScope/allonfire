import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";

/** The Storage overview: how much the Images' bucket holds, for Back Office Admins. */
export const OVERVIEW_STORAGE = {
  /**
   * What a bucket holds, which the Back Office draws a card by: the bucket's
   * own name is configured (`STORAGE_BUCKET`), so it cannot say. A new kind
   * is an entry here, one in the Back Office's registry and a line in the
   * API's list of buckets.
   */
  BUCKET_KIND: { IMAGE: "image" },
  /**
   * How long a bucket's totals are kept before it is listed again: listing
   * walks every object, so a page and its prefetch list it once; five minutes
   * is as stale as the Back Office's own copy may be.
   */
  CACHE: {
    /** Each bucket keeps its totals under this prefix and its own name. */
    KEY_PREFIX: "storage:bucket-totals:",
    TTL_MS: 5 * UNIT.MS_PER_MINUTE,
  },
  DOC: {
    OVERVIEW: {
      DESCRIPTION:
        "How many objects the Images' bucket holds and their bytes (Avatars included; kept up to 5 minutes, null when the bucket cannot be listed), and the Images by App: the bytes and count of the public ones and of the private ones. Back Office Admins only.",
      RESPONSE: {
        [HTTP.STATUS.OK]: "The Images' bucket and the Images by App and access",
      },
      SUMMARY: "Read the Storage overview",
    },
  },
  LOG_MESSAGE: {
    AVATARS_UNREADABLE: "storage avatar sizes could not be read",
    BUCKET_UNREADABLE: "storage bucket totals could not be read",
  },
  PATH: { BASE: "/storage" },
} as const;
