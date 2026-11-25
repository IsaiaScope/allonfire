import { API } from "@allonfire/api/shared/constants/api";
import { staticQuery } from "@allonfire/core/features/next/query/utils/static-query";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { GAMES } from "../constants/games";

/** The leaderboard from the API; an error throws `DetailedError`. */
export const fetchLeaderboard = (client: ApiClient) =>
  parseResponse(
    client[API.VERSION.CURRENT][
      API.SEGMENT.LAURA
    ].games.memory.leaderboard.$get()
  );

export type LeaderboardResult = Awaited<ReturnType<typeof fetchLeaderboard>>;
/** One ranked player of the leaderboard. */
export type LeaderboardEntry = LeaderboardResult["entries"][number];

/**
 * The key, tagged with the body it holds: the page hydrates under it, so a
 * wrong body fails to compile.
 */
export const leaderboardKey = queryOptions<LeaderboardResult>({
  queryKey: QUERY.GAMES.LEADERBOARD,
}).queryKey;

/**
 * The leaderboard, the caller's place and the totals: one body. The page reads
 * it on the server (`leaderboardHydration`) and the view reads it back here.
 * Asked again only when a score refreshed it, never on a clock: `"static"`
 * keeps the time out of the prerender. The page tells its failure itself.
 */
export const leaderboardQuery = (client: ApiClient) =>
  queryOptions({
    queryFn: () => fetchLeaderboard(client),
    queryKey: leaderboardKey,
    ...staticQuery({ retries: GAMES.LEADERBOARD.RETRIES, silent: true }),
  });
