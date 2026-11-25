import type { ScoreBody } from "@allonfire/api/features/laura/games/constants/schemas";
import type { SubmitAnswer } from "../actions/submit-memory-score";
import { GAMES } from "../constants/games";

/** Where saving the game stands: the dialog tells each moment in its own words. */
export type SubmitView =
  | { state: "failed" }
  | { state: "idle" }
  | { state: "notRecorded" }
  | { state: "refused" }
  | { score: ScoreBody; state: "saved" }
  | { state: "submitting" };

/**
 * What the saving mutation says, as the one view the dialog draws: waiting,
 * saved with its rank, refused because no player could have played it
 * (`notRecorded`), refused because the Session is gone or no longer allows it
 * (`refused`: trying again never works), or any other failure (the action's own
 * `failed`, or a throw that escaped it) as `failed`, which can be tried again.
 */
export const submitViewOf = ({
  data,
  isError,
  isPending,
}: {
  data: SubmitAnswer | undefined;
  isError: boolean;
  isPending: boolean;
}): SubmitView => {
  if (isPending) {
    return { state: "submitting" };
  }
  if (data?.ok) {
    return { score: data.score, state: "saved" };
  }
  if (data) {
    if (data.reason === GAMES.SUBMIT_ERROR.IMPLAUSIBLE) {
      return { state: "notRecorded" };
    }
    return {
      state: data.reason === GAMES.SUBMIT_ERROR.REFUSED ? "refused" : "failed",
    };
  }
  return { state: isError ? "failed" : "idle" };
};
