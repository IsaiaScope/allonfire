// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import {
  type MutationOptions,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { hc } from "hono/client";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import { submitMemoryScore } from "../../actions/submit-memory-score";
import { GAMES } from "../../constants/games";
import { deckBody } from "../../tests/deck-body";
import { leaderboardBody } from "../../tests/leaderboard-body";
import { deckQuery } from "../deck-queries";
import { submitScoreMutation } from "../games-mutations";
import { leaderboardQuery } from "../leaderboard-queries";

vi.mock("../../actions/submit-memory-score", () => ({
  submitMemoryScore: vi.fn(),
}));

const SCORE = { moves: 8, timeMs: 40_000 };
const SAVED = {
  ok: true,
  score: { id: "s", isGlobalBest: false, isPersonalBest: true, rank: 2 },
} as const;

/** A client whose answers are counted: `calls.leaderboard`, `calls.deck`. */
const countingApi = () => {
  const calls = { deck: 0, leaderboard: 0 };
  const client = hc<ApiType>(LOCAL.URL.TEST_API, {
    fetch: (input: RequestInfo | URL) => {
      const { pathname } = new URL(new Request(input).url);
      if (pathname.endsWith("/deck")) {
        calls.deck += 1;
        return Promise.resolve(Response.json(deckBody()));
      }
      calls.leaderboard += 1;
      return Promise.resolve(
        Response.json(
          leaderboardBody({
            stats: {
              ...leaderboardBody().stats,
              totalGames: calls.leaderboard,
            },
          })
        )
      );
    },
  });
  return { calls, client };
};

const run = <TData, TVariables>(
  queryClient: QueryClient,
  mutation: MutationOptions<TData, Error, TVariables>,
  variables: TVariables
) =>
  queryClient
    .getMutationCache()
    .build(queryClient, mutation)
    .execute(variables);

/** Shows what a mounted page shows: an observer that stays subscribed, and the way to leave. */
const show = (observer: { subscribe: (listener: () => void) => () => void }) =>
  observer.subscribe(() => undefined);

beforeEach(() => {
  vi.mocked(submitMemoryScore).mockReset();
});

describe("submitScoreMutation", () => {
  it("is keyed and tells its error in the dialog, never a toast", () => {
    const options = submitScoreMutation(new QueryClient());
    expect(options.mutationKey).toEqual(MUTATION.GAMES.SUBMIT_SCORE);
    expect(options.meta).toEqual({ errorToast: false });
  });

  it("reads the mounted leaderboard again after a saved game, and never the deck", async () => {
    vi.mocked(submitMemoryScore).mockResolvedValue(SAVED);
    const queryClient = new QueryClient();
    const { calls, client } = countingApi();
    const leaveBoard = show(
      new QueryObserver(queryClient, leaderboardQuery(client))
    );
    const leaveDeck = show(
      new QueryObserver(queryClient, deckQuery(client, 0))
    );
    await vi.waitFor(() => {
      expect(queryClient.getQueryData(QUERY.GAMES.LEADERBOARD)).toBeDefined();
      expect(queryClient.getQueryData(QUERY.GAMES.DECK(0))).toBeDefined();
    });
    expect([calls.leaderboard, calls.deck]).toEqual([1, 1]);
    const deckBefore = queryClient.getQueryData(QUERY.GAMES.DECK(0));
    const opts = submitScoreMutation(queryClient);
    expect(await run(queryClient, opts, SCORE)).toEqual(SAVED);
    await vi.waitFor(() => expect(calls.leaderboard).toBe(2));
    await vi.waitFor(() =>
      expect(
        queryClient.getQueryData<{ stats: { totalGames: number } }>(
          QUERY.GAMES.LEADERBOARD
        )?.stats.totalGames
      ).toBe(2)
    );
    expect(calls.deck).toBe(1);
    expect(queryClient.getQueryData(QUERY.GAMES.DECK(0))).toBe(deckBefore);
    leaveBoard();
    leaveDeck();
  });

  it("removes a leaderboard nobody shows, so the next visit reads it", async () => {
    vi.mocked(submitMemoryScore).mockResolvedValue(SAVED);
    const queryClient = new QueryClient();
    const { client } = countingApi();
    const leave = show(
      new QueryObserver(queryClient, leaderboardQuery(client))
    );
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(QUERY.GAMES.LEADERBOARD)).toBeDefined()
    );
    // The page went: the query is read but nobody shows it.
    leave();
    await run(queryClient, submitScoreMutation(queryClient), SCORE);
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(QUERY.GAMES.LEADERBOARD)).toBeUndefined()
    );
  });

  it("answers as soon as the game is saved, without waiting for the leaderboard to be read again", async () => {
    vi.mocked(submitMemoryScore).mockResolvedValue(SAVED);
    const queryClient = new QueryClient();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    const client = hc<ApiType>(LOCAL.URL.TEST_API, {
      fetch: async () => {
        reads += 1;
        if (reads > 1) {
          await held;
        }
        return Response.json(leaderboardBody());
      },
    });
    const leave = show(
      new QueryObserver(queryClient, leaderboardQuery(client))
    );
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(QUERY.GAMES.LEADERBOARD)).toBeDefined()
    );
    // The second read is held: the answer must not wait for it, or the dialog keeps saying "saving" after the game was saved.
    expect(
      await run(queryClient, submitScoreMutation(queryClient), SCORE)
    ).toEqual(SAVED);
    release();
    await vi.waitFor(() => expect(reads).toBe(2));
    leave();
  });

  it("reads nothing again after a game that was not saved", async () => {
    vi.mocked(submitMemoryScore).mockResolvedValue({
      ok: false,
      reason: GAMES.SUBMIT_ERROR.FAILED,
    });
    const queryClient = new QueryClient();
    const { calls, client } = countingApi();
    const leave = show(
      new QueryObserver(queryClient, leaderboardQuery(client))
    );
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(QUERY.GAMES.LEADERBOARD)).toBeDefined()
    );
    await run(queryClient, submitScoreMutation(queryClient), SCORE);
    expect(calls.leaderboard).toBe(1);
    leave();
  });
});
