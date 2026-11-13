import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import type { StationSignage } from "@/shared/components/station-notice";

/** How long the private links a list holds stay valid, at least. */
const LINK_SECONDS = IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR;

const PAGE_SIZES = [25, 50, 100] as const;

/** The Back Office's Images page: its tunables, each written once. */
export const IMAGES = {
  /** Why adding Images failed, as the form says it. */
  ADD_ERROR: {
    FAILED: "failed",
    INVALID: "invalid",
    /** No Session, or one the API no longer lets add Images: sign in again. */
    REFUSED: "refused",
    /** A file or the request is over the API's size limits (413). */
    TOO_LARGE: "tooLarge",
    /** A file the API cannot read as a picture (415 or 400). */
    UNSUPPORTED: "unsupported",
  },
  /** Brushed in the Add button: 写, a photograph (the brush face carries it). */
  ADD_KANJI: "写",
  /** What a saved add tells the form to do. */
  ADD_NOTICE: { ADDED: "added" },
  /** Brushed in Apply to all pictures: 拡, to spread (the brush face carries it). */
  APPLY_KANJI: "拡",
  /**
   * The list's rows (`imagesHydration`) and one Image (`imageHydration`), kept in
   * the visitor's browser per address (ADR 0028) until a change to Images
   * calls `updateTag(TAG)`. The rows hold private links signed for an hour,
   * and a cache never outlives them: gone after an hour (`expire`), read
   * again in the background after half of it (`revalidate`), and another
   * Admin's browser reuses its copy for 5 minutes (`stale`, nothing can
   * reach it sooner).
   */
  CACHE: {
    LIFE: {
      expire: LINK_SECONDS,
      revalidate: LINK_SECONDS / 2,
      stale: 5 * UNIT.SECONDS_PER_MINUTE,
    },
    TAG: "images",
  },
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: PAGE_SIZES[0],
  /** Brushed in Delete's button: 消, to erase (the brush face carries it). */
  DELETE_KANJI: "消",
  /** Why saving an Image failed, as the form says it. */
  EDIT_ERROR: {
    /** Someone changed the Image since the form was opened (the API's 409). */
    CHANGED: "changed",
    FAILED: "failed",
    GONE: "gone",
    INVALID: "invalid",
    /** No Session, or one the API no longer lets change Images: sign in again. */
    REFUSED: "refused",
  },
  /** What a saved edit tells the form to do. */
  EDIT_NOTICE: { SAVED: "saved" },
  /**
   * Where the Edit form's Image field group finds its fields: the group's
   * names mapped to the form's. The Add form binds each row's group by
   * prefix (`rows[2]`), the names posted under it.
   */
  FORM_FIELDS: {
    EDIT: {
      access: "access",
      alt: "alt",
      apps: "apps",
      picker: "picker",
    },
  },
  /**
   * How the address changes: a filter or a page pushes a history entry, so
   * Back goes to the previous view.
   */
  HISTORY: {
    PUSH: { clearOnDefault: true, history: "push" },
    /** Typing replaces the history entry: Back should not walk each keystroke. */
    REPLACE: { clearOnDefault: true, history: "replace" },
  },
  PAGE_SIZES,
  /** The list's address parameters, as the API's query names them. */
  PARAM: {
    PAGE: "page",
    PER_PAGE: "perPage",
    SEARCH: "search",
  },
  /** The Images Section's own pages, under its path. */
  PATH: { NEW: "/new" },
  /** Brushed in the Filter panel's Reset: 戻, back to the start. */
  RESET_KANJI: "戻",
  /** Asks again this many times after a server or network failure. */
  RETRIES: 1,
  /** Brushed in the Save button: 済, done (the brush face carries it). */
  SAVE_KANJI: "済",
  /**
   * The list's notice where its rows stand, decoration only: nothing
   * matches (空席, vacant).
   */
  SIGNAGE: {
    EMPTY: { CODE: "0", KANA: "該当なし", WALL_KANJI: "空席" },
  } satisfies Record<string, StationSignage>,
  /** The side in px of a stored picture's tile on each surface, as `sizes` tells next/image. */
  THUMB_PX: { card: 96, page: 160, row: 48 },
  /** How long typing rests before the address changes. */
  TYPING_REST_MS: 300,
  /**
   * The most a Server Action may be sent (Next's default is 1 MB): the API's
   * whole upload plus 1 MiB for the multipart parts around it.
   */
  UPLOAD_BODY_LIMIT: IMAGE.LIMIT.UPLOAD_BYTES + UNIT.BYTES_PER_MIB,
} as const;
