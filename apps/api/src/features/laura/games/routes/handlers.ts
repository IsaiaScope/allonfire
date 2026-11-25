import { requireApp } from "@allonfire/auth/features/hono/guards/middleware/require-app";
import { manageGuard } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  CodedError,
  forbidden,
  invalidHook,
} from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App } from "@allonfire/database/enums";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { isPlausibleScore } from "@allonfire/database/features/apps/laura/utils/is-plausible-score";
import { enterableApps } from "@allonfire/database/features/auth/access/access";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { LAURA } from "../../constants/laura";
import type { LauraDeps } from "../../utils/deps";
import {
  type DeckBody,
  type LeaderboardBody,
  type ScoreBody,
  scoreInputSchema,
} from "../constants/schemas";
import { toDeckImage } from "../utils/deck-body";
import { deckRoute, leaderboardRoute, scoreRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/**
 * Six random Images for a board. A draw is not stored state, so the answer is
 * never cached: a cached copy would deal the same photos until it expired.
 */
export const deckHandlers = (deps: LauraDeps) =>
  factory.createHandlers(deckRoute, requireApp(App.LAURA), async (c) => {
    const images = await deps.randomImages({
      app: App.LAURA,
      count: MEMORY_RULE.PAIRS,
      enterable: enterableApps(c.get(AUTH.VAR.SESSION).user),
    });
    const now = new Date();
    const body = {
      images: images.map((image) => toDeckImage(image, now)),
      needed: MEMORY_RULE.PAIRS,
    } satisfies DeckBody;
    c.header(HTTP.HEADER.CACHE_CONTROL, HTTP.CACHE_CONTROL.NO_CACHE);
    return c.json(body, HTTP.STATUS.OK);
  });

/**
 * Saves a finished game of the caller. The order is the contract: the door for
 * Laura, the fresh read of the Session and the Member, the parse, the
 * plausibility refusal (nothing written), then the Profile and the write.
 */
export const scoreHandlers = (deps: LauraDeps) =>
  factory.createHandlers(
    scoreRoute,
    requireApp(App.LAURA),
    manageGuard(deps.canPlay),
    validator("json", scoreInputSchema, invalidHook),
    async (c) => {
      const { moves, timeMs } = c.req.valid("json");
      if (!isPlausibleScore({ moves, timeMs })) {
        throw new CodedError({
          code: LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE,
          status: HTTP.STATUS.BAD_REQUEST,
        });
      }
      const { id: userId } = c.get(AUTH.VAR.SESSION).user;
      if (!(await deps.ensureProfile(userId))) {
        throw forbidden();
      }
      const outcome = await deps.submitMemoryScore({ moves, timeMs, userId });
      if ("saved" in outcome) {
        return c.json(outcome.saved satisfies ScoreBody, HTTP.STATUS.CREATED);
      }
      // The Profile went with a Membership revoked since it was checked.
      if (outcome.refused === "noProfile") {
        throw forbidden();
      }
      // The game ends sooner after the last save than it takes to play.
      throw new CodedError({
        code: ERROR.CODE.RATE_LIMITED,
        status: HTTP.STATUS.TOO_MANY_REQUESTS,
        values: {
          seconds: Math.ceil(outcome.retryAfterMs / UNIT.MS_PER_SECOND),
        },
      });
    }
  );

/** The top players, the caller's own place and everyone's totals; each player's email goes with their name (Laura is private), no user id leaves. */
export const leaderboardHandlers = (deps: LauraDeps) =>
  factory.createHandlers(leaderboardRoute, requireApp(App.LAURA), async (c) => {
    const { id: userId } = c.get(AUTH.VAR.SESSION).user;
    const [entries, me, stats] = await Promise.all([
      deps.memoryLeaderboard(LAURA.GAMES.LIMIT.LEADERBOARD_TOP),
      deps.userMemoryStats(userId),
      deps.memoryStats(),
    ]);
    const body = {
      entries: entries.map((entry) => ({
        email: entry.email,
        image: deps.avatarLink(entry.image),
        imageBlurDataUrl: entry.imageBlurDataUrl,
        isMe: entry.userId === userId,
        moves: entry.moves,
        name: entry.name,
        playedAt: entry.playedAt.toISOString(),
        rank: entry.rank,
        timeMs: entry.timeMs,
      })),
      me,
      stats,
    } satisfies LeaderboardBody;
    c.header(HTTP.HEADER.CACHE_CONTROL, HTTP.CACHE_CONTROL.NO_CACHE);
    return c.json(body, HTTP.STATUS.OK);
  });
