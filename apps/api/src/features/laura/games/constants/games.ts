import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";

/** Laura's Memory game: the deck, the scores and the leaderboard, for a Laura User. */
export const LAURA_GAMES = {
  DOC: {
    DECK: {
      DESCRIPTION:
        "Six random Images placed in Laura and visible to the caller, as the pictures of a Memory board. Never cached: every request is a new draw. Laura Members only.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "Random Images for a board, and how many a board needs; fewer when Laura holds fewer",
      },
      SUMMARY: "Draw a Memory deck",
    },
    LEADERBOARD: {
      DESCRIPTION:
        "The best game of each current Laura Member, fewest moves first and then the fastest, the top 10. `me` is the caller's own best and rank, which might be past 10. Entries carry each player's email beside their name (Laura is private) and no user id. Laura Members only.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "The best players, the caller's own best and rank, and everyone's totals",
      },
      SUMMARY: "Show the Memory leaderboard",
    },
    SCORES: {
      DESCRIPTION:
        "Saves a finished game of the caller. A game that no player could have produced (too few moves, or faster than the board lets a pair rest) is refused with `IMPLAUSIBLE_SCORE` and nothing is written. A game that ends sooner after the caller's last save than it takes to play, or a caller who saves more than 10 games a minute, is refused with `429`. The same moves and time sent again within 30 seconds is the game already saved. Laura Members only.",
      RESPONSE: {
        [HTTP.STATUS.CREATED]: "The game is saved, and what rank it earned",
      },
      SUMMARY: "Save a Memory game",
    },
  },
  ERROR_CODE: { IMPLAUSIBLE_SCORE: "IMPLAUSIBLE_SCORE" },
  LIMIT: {
    /** How many players the leaderboard lists. */
    LEADERBOARD_TOP: 10,
    /** How many games one User can save in a window (`WINDOW.SAVES_MS`): about twenty is a long evening. */
    SAVES: 10,
  },
  OPENAPI_TAG: "Memory",
  PATH: {
    BASE: "/games",
    DECK: "/memory/deck",
    LEADERBOARD: "/memory/leaderboard",
    SCORES: "/memory/scores",
  },
  /** Separates a User's save counter from the other limiters' in the shared store. */
  RATE_KEY: "laura-scores:",
  WINDOW: { SAVES_MS: UNIT.MS_PER_MINUTE },
} as const;
