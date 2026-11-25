import { columnsQuery } from "@allonfire/core/features/search/columns-query";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { barChartHeight } from "@allonfire/ui/features/chart/utils/bar-chart-height";
import type { StationSignage } from "@/shared/components/station-notice";

/**
 * The columns the View tab can hide (ADR 0031): one per App, by its enum value
 * (`hide=LAURA`), then the date. Only the email never hides.
 */
const HIDEABLE = [...objectValues(App), "created"] as const;

/** The picture field's name in both User forms. */
const AVATAR_FIELD = "avatar";

/** The Back Office's Users list: its tunables, each written once. */
export const USERS = {
  ADD: {
    /** Why the Add a User action refused, each with its message over the form. */
    ERROR: {
      FAILED: "failed",
      INVALID: "invalid",
      /** No Session, or one the API no longer lets change Users: sign in again. */
      REFUSED: "refused",
      TAKEN: "taken",
    },
    /**
     * What the Add a User action tells beside a refusal: the User was added,
     * their picture was not saved (the form toasts it and opens the list).
     */
    NOTICE: { AVATAR_FAILED: "avatarFailed" },
  },
  /**
   * The picture field's name in both User forms; its removal posts under
   * `avatarRemoval(AVATAR_FIELD)` (ui's `avatar-change`).
   */
  AVATAR_FIELD,
  /**
   * The list's rows (`usersHydration`) and one User (`userHydration`), kept in
   * the visitor's browser per address (ADR 0028) until a change to Users
   * calls `updateTag(TAG)`, which drops this browser's copies. The rows hold Avatar links
   * signed for an hour, and a cache never outlives them: gone after an hour
   * (`expire`), read again in the background after half of it (`revalidate`),
   * and another Admin's browser reuses its copy for 5 minutes (`stale`,
   * nothing can reach it sooner).
   */
  CACHE: {
    LIFE: IMAGE_SERVER.LINK.CACHE_LIFE,
    TAG: "users",
  },
  EDIT: {
    /** Why the Edit a User action refused, each with its message over the form. */
    ERROR: {
      /** Someone changed the User since the form was opened (the API's 409). */
      CHANGED: "changed",
      FAILED: "failed",
      GONE: "gone",
      INVALID: "invalid",
      OWN_ROLE: "ownRole",
      /** No Session, or one the API no longer lets change Users: sign in again. */
      REFUSED: "refused",
    },
    /**
     * What the Edit a User action answers once the User is saved: all of it,
     * or all but their picture. The form toasts either and opens the list.
     */
    NOTICE: { AVATAR_FAILED: "avatarFailed", SAVED: "saved" },
  },
  /**
   * Where each part both User forms share (`user-form-parts`) finds its
   * fields: the part's names mapped to the form's, the same in both forms.
   */
  FORM_FIELDS: {
    AVATAR: { avatar: AVATAR_FIELD },
    NAME: { name: "name" },
    PASSWORD: { confirmPassword: "confirmPassword", password: "password" },
    ROLES: { roles: "roles" },
    VERIFICATION: { verification: "verification" },
  },
  /** How the address names the hidden columns (ADR 0031). */
  HIDE: columnsQuery(HIDEABLE),
  /** The columns the View tab lists: one per App, then the date. */
  HIDEABLE,
  /**
   * How the address changes: a search replaces the history entry (Back should
   * not walk through each keystroke); a page or page size pushes one.
   */
  HISTORY: {
    PAGE: { clearOnDefault: true, history: "push" },
    SEARCH: { clearOnDefault: true, history: "replace" },
  },
  /** Brushed on the buttons and cards (the brush face carries each glyph). */
  KANJI: {
    /** The Add button: 乗, to board. */
    ADD: "乗",
    /** Faint behind a User's card: 乗, a passenger. */
    CARD: "乗",
    /** After the crop dialog's title: 切, to cut. */
    CROP: "切",
    /** The crop dialog's Use: 決, to decide. */
    CROP_USE: "決",
    /** Delete's button: 消, to erase. */
    DELETE: "消",
    /** The picture field's choose button: 写, a photograph. */
    PICTURE: "写",
    /** The Filter panel's Reset: 戻, back to the start. */
    RESET: "戻",
    /** Save: 済, settled. */
    SAVE: "済",
    /** The crop dialog's Zoom in: 拡, to enlarge. */
    ZOOM_IN: "拡",
    /** Its Zoom out: 縮, to shrink. */
    ZOOM_OUT: "縮",
  },
  LIMIT: {
    /** Asks again this many times after a server or network failure. */
    RETRIES: 1,
    /** How long typing rests before the address changes. */
    TYPING_REST_MS: 300,
  },
  /** A Role row's choice for an App the new User is not in. */
  NO_ROLE: "none",
  /**
   * The overview on Home: the chart's series keys, and their colours
   * (Users, Admins) from the Design's chart tokens.
   */
  OVERVIEW: {
    ADMINS_COLOR: "var(--chart-3)",
    ADMINS_KEY: "admins",
    CHART_COLOR: "var(--chart-1)",
    /** A row for each App, two bars a row (Users, Admins): the room the failed and refused cards keep too. */
    CHART_HEIGHT_PX: barChartHeight(objectValues(App).length, 2),
    USERS_KEY: "users",
  },
  /** The Users Section's own pages, under its path. */
  PATH: { NEW: "/new" },
  /**
   * The list's notices where its rows stand, decoration only (the brush face
   * carries each wall kanji): nobody matches, the stamp reads 0 and 該当なし
   * (no match) over 空席 (vacant seats).
   */
  SIGNAGE: {
    EMPTY: { CODE: "0", KANA: "該当なし", KANJI: "空席" },
  } satisfies Record<string, StationSignage>,
  /** The columns the Sort tab lists: the plain ones the database orders by. */
  SORTABLE: ["email", "created"] as const,
  /**
   * The verification row's choices: the email counts as verified (an Admin
   * vouches), or the User verifies it at their next sign-in.
   */
  VERIFICATION: { REQUIRED: "required", VERIFIED: "verified" },
} as const;
