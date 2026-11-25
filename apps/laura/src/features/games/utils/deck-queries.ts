import { API } from "@allonfire/api/shared/constants/api";
import { staticQuery } from "@allonfire/core/features/next/query/utils/static-query";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { GAMES } from "../constants/games";

/**
 * A draw of Memory's deck from the API; an error throws `DetailedError`.
 *
 * @internal Read by this file's tests.
 */
export const fetchDeck = (client: ApiClient) =>
  parseResponse(
    client[API.VERSION.CURRENT][API.SEGMENT.LAURA].games.memory.deck.$get()
  );

/**
 * One play's deck. A draw is not stored state: a private-cache copy would deal
 * the same photos until it went stale, and a key shared across plays or read
 * again on focus would reshuffle a board under the player. So it is a query
 * alone: a key per round (`round`), never stale (`"static"`, which also keeps
 * the clock out of the prerender), gone the moment the board leaves
 * (`gcTime: 0`), and outside `QUERY.GAMES.ALL`, so no refresh of what a score
 * changes reaches it. The board tells its failure itself.
 */
export const deckQuery = (client: ApiClient, round: number) =>
  queryOptions({
    gcTime: 0,
    queryFn: () => fetchDeck(client),
    queryKey: QUERY.GAMES.DECK(round),
    ...staticQuery({ retries: GAMES.MEMORY.DECK.RETRIES, silent: true }),
  });
