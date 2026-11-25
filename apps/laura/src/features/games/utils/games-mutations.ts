import { aofErrorMeta } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { invalidateStatic } from "@allonfire/core/features/next/query/utils/invalidate-static";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import {
  type Score,
  type SubmitAnswer,
  submitMemoryScore,
} from "../actions/submit-memory-score";

/**
 * Saves a finished game through the `submitMemoryScore` action (which clears
 * the server's copy of the leaderboard), then reads this browser's again:
 * `invalidateStatic`, since a plain invalidation never reads an active
 * `"static"` query, so the best badge and the leaderboard page would keep the
 * old numbers (in the background, after the answer). Nothing else is refreshed: a score never redraws a deck. Not an
 * optimistic mutation: a score is not a toggle and its rank cannot be
 * guessed. The dialog tells its own error, so no toast.
 */
export const submitScoreMutation = (
  queryClient: QueryClient
): UseMutationOptions<SubmitAnswer, Error, Score> => ({
  meta: aofErrorMeta(false),
  mutationFn: submitMemoryScore,
  mutationKey: MUTATION.GAMES.SUBMIT_SCORE,
  // The answer does not wait for the refresh: a slow read must not keep the
  // dialog on "saving" after the game was saved.
  onSuccess: (answer) => {
    if (answer.ok) {
      invalidateStatic(queryClient, QUERY.GAMES.LEADERBOARD).catch(
        () => undefined
      );
    }
  },
});
