import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { LAURA } from "../../constants/laura";
import type { LauraDeps } from "../../utils/deps";
import { deckHandlers, leaderboardHandlers, scoreHandlers } from "./handlers";

/** Memory: the deck draw, the score write and the leaderboard read. */
export const gamesRoutes = (deps: LauraDeps) =>
  new Hono<AuthEnv>()
    .get(LAURA.GAMES.PATH.DECK, ...deckHandlers(deps))
    .post(LAURA.GAMES.PATH.SCORES, ...scoreHandlers(deps))
    .get(LAURA.GAMES.PATH.LEADERBOARD, ...leaderboardHandlers(deps));
