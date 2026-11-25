import { columnsQuery } from "@allonfire/core/features/search/columns-query";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import type { StationSignage } from "@/shared/components/station-notice";

const PAGE_SIZES = [25, 50, 100] as const;

/**
 * The columns the View tab can hide (ADR 0031): every one but the picture.
 * `hide=name,size` in the address.
 */
const HIDEABLE = [
  "name",
  "alt",
  "dimensions",
  "size",
  "access",
  "apps",
  "created",
] as const;

/** The Back Office's Images page: its tunables, each written once. */
export const IMAGES = {
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
    LIFE: IMAGE_SERVER.LINK.CACHE_LIFE,
    TAG: "images",
  },
  DEFAULT: { PAGE: 1, PAGE_SIZE: PAGE_SIZES[0] },
  EDIT: {
    /** Why saving an Image failed, as the form says it. */
    ERROR: {
      /** Someone changed the Image since the form was opened (the API's 409). */
      CHANGED: "changed",
      FAILED: "failed",
      GONE: "gone",
      INVALID: "invalid",
      /** No Session, or one the API no longer lets change Images: sign in again. */
      REFUSED: "refused",
    },
    /** What a saved edit tells the form to do. */
    NOTICE: { SAVED: "saved" },
  },
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
  /** How the address names the hidden columns (ADR 0031). */
  HIDE: columnsQuery(HIDEABLE),
  /** The columns the View tab lists, in the table's order. */
  HIDEABLE,
  /**
   * How the address changes: a filter or a page pushes a history entry, so
   * Back goes to the previous view.
   */
  HISTORY: {
    PUSH: { clearOnDefault: true, history: "push" },
    /** Typing replaces the history entry: Back should not walk each keystroke. */
    REPLACE: { clearOnDefault: true, history: "replace" },
  },
  /** Brushed on the buttons (the brush face carries each glyph). */
  KANJI: {
    /** The Add button: 写, a photograph. */
    ADD: "写",
    /** Apply to all pictures: 拡, to spread. */
    APPLY: "拡",
    /** Delete's button: 消, to erase. */
    DELETE: "消",
    /** The Filter panel's Reset: 戻, back to the start. */
    RESET: "戻",
    /** The Save button: 済, done. */
    SAVE: "済",
  },
  LIMIT: {
    /** Asks again this many times after a server or network failure. */
    RETRIES: 1,
    /** How long typing rests before the address changes. */
    TYPING_REST_MS: 300,
  },
  PAGE_SIZES,
  /** The list's address parameters, as the API's query names them. */
  PARAM: {
    /** The hidden columns, `hide=size,apps` (ADR 0031): display only, never asked of the API. */
    HIDE: "hide",
    PAGE: "page",
    PER_PAGE: "perPage",
    SEARCH: "search",
    SORT: "sort",
  },
  /** The Images Section's own pages, under its path. */
  PATH: { NEW: "/new" },
  /**
   * The list's notice where its rows stand, decoration only: nothing
   * matches (空席, vacant).
   */
  SIGNAGE: {
    EMPTY: { CODE: "0", KANA: "該当なし", KANJI: "空席" },
  } satisfies Record<string, StationSignage>,
  SIZE: {
    /** The side in px of a stored picture's tile on each surface, as `sizes` tells next/image. */
    THUMB_PX: { card: 120, page: 160, row: 48 },
  },
  /** The columns the Sort tab lists: the plain ones the database orders by. */
  SORTABLE: ["created", "size", "access", "name"] as const,
} as const;
