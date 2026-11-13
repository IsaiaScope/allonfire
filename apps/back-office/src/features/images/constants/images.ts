import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import type { StationSignage } from "@/shared/components/station-notice";

/** How long the private links a list holds stay valid, at least. */
const LINK_SECONDS = IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR;

const PAGE_SIZES = [25, 50, 100] as const;

/** The Back Office's Images page: its tunables, each written once. */
export const IMAGES = {
  /** Brushed in the Add button: 写, a photograph (the brush face carries it). */
  ADD_KANJI: "写",
  /**
   * The list's rows (`imagesHydration`) and one Image (`readImage`), kept in
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
  /**
   * The list's notice where its rows stand, decoration only: nothing
   * matches (空席, vacant).
   */
  SIGNAGE: {
    EMPTY: { CODE: "0", KANA: "該当なし", WALL_KANJI: "空席" },
  } satisfies Record<string, StationSignage>,
  /** How long typing rests before the address changes. */
  TYPING_REST_MS: 300,
} as const;
