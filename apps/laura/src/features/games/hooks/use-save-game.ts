import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { submitScoreMutation } from "../utils/games-mutations";
import { submitViewOf } from "../utils/submit-view";

/**
 * Saving a finished game, whole: `save` sends the score, `retry` sends the
 * same one again (the mutation keeps what it was last given as `score`),
 * `view` is where it stands for the dialog (`submitViewOf`). The board only
 * says a game ended.
 */
export const useSaveGame = () => {
  const queryClient = useQueryClient();
  const {
    data,
    isError,
    isPending,
    mutate,
    variables: score,
  } = useMutation(submitScoreMutation(queryClient));
  const retry = useCallback(() => {
    if (score) {
      mutate(score);
    }
  }, [mutate, score]);
  return {
    retry,
    save: mutate,
    score,
    view: submitViewOf({ data, isError, isPending }),
  };
};
