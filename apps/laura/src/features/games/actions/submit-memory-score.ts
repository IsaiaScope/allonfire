"use server";

import { LAURA as API_LAURA } from "@allonfire/api/features/laura/constants/laura";
import type { ScoreBody } from "@allonfire/api/features/laura/games/constants/schemas";
import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { refusalOf } from "@/features/api/utils/api-refusal";
import { serverApi } from "@/features/api/utils/server-api";
import { GAMES } from "../constants/games";
import type { SubmitError } from "../constants/games-schema";

/** A finished game: what is saved. */
export type Score = { moves: number; timeMs: number };

/** What saving a game answers: its rank, or why it was not saved. A value, never a throw. */
export type SubmitAnswer =
  | { ok: false; reason: SubmitError }
  | { ok: true; score: ScoreBody };

/**
 * Saves a finished game through the API as the visitor (the Session, the
 * Member and the rule are checked there), then drops the kept leaderboard in
 * the same request. A refusal is told as a value, never a throw: production
 * hides a thrown message from the browser.
 */
export const submitMemoryScore = async (
  score: Score
): Promise<SubmitAnswer> => {
  try {
    const client = await serverApi();
    const response = await client[API.VERSION.CURRENT][
      API.SEGMENT.LAURA
    ].games.memory.scores.$post({ json: score });
    if (response.status === HTTP.STATUS.CREATED) {
      updateTag(GAMES.CACHE.TAG);
      return { ok: true, score: await response.json() };
    }
    const reason = await refusalOf(response, GAMES.SUBMIT_ERROR, {
      [API_LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE]:
        GAMES.SUBMIT_ERROR.IMPLAUSIBLE,
    });
    return { ok: false, reason };
  } catch {
    return { ok: false, reason: GAMES.SUBMIT_ERROR.FAILED };
  }
};
