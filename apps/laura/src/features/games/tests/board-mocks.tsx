import { worker } from "@allonfire/config/tests/browser/msw";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { DECK_URL, LEADERBOARD_URL } from "@/shared/tests/msw/handlers";
import { deckBody } from "./deck-body";
import { leaderboardBody } from "./leaderboard-body";

/** Counts the reads a board test made. */
export const counts = { deck: 0, leaderboard: 0 };

/** A stored Image is drawn through the image server: here, a mark. */
export const imageServerMock = async () => ({
  ...(await import("@allonfire/ui/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
});

/** The API answers a deck and a leaderboard, counting each ask. */
export const answerBoard = () => {
  counts.deck = 0;
  counts.leaderboard = 0;
  worker.use(
    http.get(DECK_URL, () => {
      counts.deck += 1;
      return HttpResponse.json(deckBody());
    }),
    http.get(LEADERBOARD_URL, () => {
      counts.leaderboard += 1;
      return HttpResponse.json(leaderboardBody());
    })
  );
};

/**
 * The room a page leaves the board: a definite size, as the signed-in frame's
 * flex chain gives it. The cards stand out of flow in it, so a board with no
 * room would measure none.
 */
export const boardFrame = (view: ReactNode) => (
  <div className="flex flex-col" style={{ height: 700, width: 900 }}>
    {view}
  </div>
);
