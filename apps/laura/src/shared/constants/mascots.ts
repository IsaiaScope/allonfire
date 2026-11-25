import type {
  OceanArtKey,
  OceanMonoKey,
} from "@allonfire/design/designs/ocean/mascot-art";
import type { AOFAction } from "@allonfire/ui/shared/constants/action";

/**
 * Which picture of the Ocean pool (`OCEAN_ART`) each moment of Laura shows:
 * the one table every page reads, so a moment never picks its own.
 */
export const MASCOT = {
  /**
   * The one-colour picture faint behind each action's button, as the Back
   * Office brushes a kanji there. Never the same beside another action that
   * can share its row: Back sits left of Send, Save and Retry.
   */
  ACTION: {
    /** The lighthouse is the way back to the harbour. */
    back: "LIGHTHOUSE_MONO",
    /** A crab scuttles in through the door. */
    enter: "CRAB_MONO",
    /** A jellyfish pulses again and again. */
    retry: "JELLYFISH_MONO",
    /** An octopus holds on with eight arms. */
    save: "OCTOPUS_MONO",
    /** A jellyfish drifts off with it. */
    send: "JELLYFISH_MONO",
  } as const satisfies Record<AOFAction, OceanMonoKey>,
  /** Laura's own: its crumb, always, and any crumb with no picture of its own. The octopus of the forms. */
  APP: "OCTOPUS_NOTO",
  /**
   * The picture beside each Section's crumb and its pages', keyed by the
   * `Navigation` label. A Section takes one of the primary pictures; a page
   * under it any of the pool that fits. All read on both grounds: none of
   * the full-colour pictures whose fill all but vanishes on the light one
   * (the Noto jellyfish, lighthouse, shark and whale, the Fluent wave).
   */
  CRUMB: {
    /** Favorites: the squid's colour is the closest to a heart. */
    favorites: "SQUID_FLUENT",
    /** Pages float by like a jellyfish drifting through a current. */
    gallery: "JELLYFISH_FLUENT",
    /** The lighthouse stands over the board: the one on top is seen. */
    leaderboard: "LIGHTHOUSE_MONO",
    /** The octopus with eight arms and a famous memory. */
    memory: "OCTOPUS_FIREFOX",
    /** A crab scuttles side to side, as a card flips. */
    play: "CRAB_MONO",
    /** The squid shoots up from the deep. */
    upload: "SQUID_NOTO",
  },
  /** The error page and the error notice. */
  ERROR: "OCTOPUS_NOTO",
  /**
   * The photos' empty moments, each its own picture (a failed load shows
   * `ERROR`'s, like every other error): the classic octopus over the empty
   * Gallery, waiting for its first photo; the Firefox octopus over the empty
   * Favorites.
   */
  GALLERY: {
    EMPTY: "OCTOPUS_CLASSIC",
    FAVORITES_EMPTY: "OCTOPUS_FIREFOX",
  },
  /**
   * Memory's moments with nothing to show, each its own picture (a failed
   * load shows `ERROR`'s): the classic octopus waits for photos to deal, the
   * Firefox one over a leaderboard no one has played yet.
   */
  GAMES: {
    /**
     * The badges of a game, full-colour emoji of the Noto set: a trophy for
     * a record (also the board's best-time badge), a star for a personal
     * best, the first-place medal for a rank.
     */
    BADGE_PERSONAL_BEST: "STAR_NOTO",
    BADGE_RANK: "MEDAL_NOTO",
    BADGE_RECORD: "TROPHY_NOTO",
    /** The leaderboard's headings: the caller's figures, everyone's. */
    HEADING_EVERYONE: "BUSTS_NOTO",
    HEADING_YOU: "BUST_NOTO",
    /** The podium's medals, first to third: the same Noto set (the first is also the rank badge). */
    MEDAL_BRONZE: "MEDAL_BRONZE_NOTO",
    MEDAL_FIRST: "MEDAL_NOTO",
    MEDAL_SILVER: "MEDAL_SILVER_NOTO",
    NEED_MORE: "OCTOPUS_CLASSIC",
    NO_SCORES: "OCTOPUS_FIREFOX",
    /** The podium steps' silver and bronze trophies (the gold is `BADGE_RECORD`). */
    TROPHY_BRONZE: "TROPHY_BRONZE_NOTO",
    TROPHY_SILVER: "TROPHY_SILVER_NOTO",
  },
  /** The signed-out card's band: the forms' octopus, the owner's pick. */
  GATE: "OCTOPUS_NOTO",
  /** The Install hint's card. */
  INSTALL: "OCTOPUS_FIREFOX",
  /** A signed-in page waiting. */
  LOADING: "OCTOPUS_CLASSIC",
  /** The 404. */
  NOT_FOUND: "SQUID_NOTO",
  /** The Offline page and the offline card. */
  OFFLINE: "JELLYFISH_NOTO",
  /** The picture faint behind the act that removes a photo: a crab pinches it away. */
  REMOVE: "CRAB_MONO",
  /** The picture faint behind a row of the Upload form's Remove: an octopus lets go of it. */
  REMOVE_ROW: "OCTOPUS_MONO",
  /** What peeks in at the end of a toast, per kind. */
  TOAST: {
    ERROR: "OCTOPUS_NOTO",
    INFO: "OCTOPUS_CLASSIC",
    SUCCESS: "OCTOPUS_FIREFOX",
    WARNING: "SQUID_NOTO",
  },
} as const satisfies Record<string, OceanArtKey | Record<string, OceanArtKey>>;
