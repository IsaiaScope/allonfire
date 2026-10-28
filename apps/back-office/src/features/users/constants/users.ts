import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import type { StationSignage } from "@/shared/components/station-notice";

/** How long the Avatar links a list holds stay valid, at least. */
const LINK_SECONDS = IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR;

/** The Back Office's Users list: its tunables, each written once. */
export const USERS = {
  /** Why the Add a User action refused, each with its message over the form. */
  ADD_ERROR: { FAILED: "failed", INVALID: "invalid", TAKEN: "taken" },
  /** Brushed in the Add button: 乗, to board (the brush face carries it). */
  ADD_KANJI: "乗",
  /**
   * What the Add a User action tells beside a refusal: the User was added,
   * their picture was not saved (the form toasts it and opens the list).
   */
  ADD_NOTICE: { AVATAR_FAILED: "avatarFailed" },
  /**
   * The list's rows, kept on this server per Session and address
   * (`readUsers`) until a change to Users calls `updateTag(TAG)`, which drops
   * every kept list and this browser's copy. The rows hold Avatar links
   * signed for an hour, and a cache never outlives them: gone after an hour
   * (`expire`), read again in the background after half of it (`revalidate`),
   * and another Admin's browser reuses its copy for 5 minutes (`stale`,
   * nothing can reach it sooner).
   */
  CACHE: {
    LIFE: {
      expire: LINK_SECONDS,
      revalidate: LINK_SECONDS / 2,
      stale: 5 * UNIT.SECONDS_PER_MINUTE,
    },
    TAG: "users",
  },
  /** Brushed in the Cancel button: 戻, to go back (the brush face carries it). */
  CANCEL_KANJI: "戻",
  /** Brushed faint behind a User's card: 乗, a passenger (the brush face
   *  carries it). */
  CARD_KANJI: "乗",
  /** How long an email's tip says it was copied (or could not be). */
  COPIED_MS: 2 * UNIT.MS_PER_SECOND,
  /** Brushed after the crop dialog's title: 切, to cut (the brush face
   *  carries it). */
  CROP_KANJI: "切",
  /** Brushed in the crop dialog's Use: 決, to decide (the brush face
   *  carries it). */
  CROP_USE_KANJI: "決",
  /** Brushed in Delete's button: 消, to erase (the brush face carries it). */
  DELETE_KANJI: "消",
  /**
   * How the address changes: a search replaces the history entry (Back should
   * not walk through each keystroke); a page or page size pushes one.
   */
  HISTORY: {
    PAGE: { clearOnDefault: true, history: "push" },
    SEARCH: { clearOnDefault: true, history: "replace" },
  },
  /** A Role row's choice for an App the new User is not in. */
  NO_ROLE: "none",
  /** The Users Section's own pages, under its path. */
  PATH: { NEW: "/new" },
  /** Brushed in the picture field's choose button: 写, a photograph
   *  (the brush face carries it). */
  PICTURE_KANJI: "写",
  /** Brushed in the Filter panel's Reset: 戻, back to the start (the brush
   *  face carries it). */
  RESET_KANJI: "戻",
  /** Asks again this many times after a server or network failure. */
  RETRIES: 1,
  /**
   * The list's notices where its rows stand, decoration only (the brush face
   * carries each wall kanji): nobody matches, the stamp reads 0 and 該当なし
   * (no match) over 空席 (vacant seats); the page is past the last, 終
   * (end) and 終点 (the terminus) over 終点.
   */
  SIGNAGE: {
    EMPTY: { CODE: "0", KANA: "該当なし", WALL_KANJI: "空席" },
    PAST_END: { CODE: "終", KANA: "終点", WALL_KANJI: "終点" },
  } satisfies Record<string, StationSignage>,
  /** How long typing rests before the address changes. */
  TYPING_REST_MS: 300,
  /** Brushed in the crop dialog's Zoom in: 拡, to enlarge (the brush face
   *  carries it). */
  ZOOM_IN_KANJI: "拡",
  /** Brushed in its Zoom out: 縮, to shrink (the brush face carries it). */
  ZOOM_OUT_KANJI: "縮",
} as const;
