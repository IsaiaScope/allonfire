import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { GAMES } from "../constants/games";
import { fetchLeaderboard, leaderboardKey } from "./leaderboard-queries";

/**
 * The leaderboard as the visitor's Session reads it (the API checks it),
 * ready for the view's TanStack cache under the key it reads back. Kept in
 * their browser only (`"use cache: private"`) under `GAMES.CACHE.TAG`, which a
 * saved score clears (ADR 0028); dehydrated inside the cache, since TanStack
 * stamps the time into what it dehydrates. A refusal is thrown, never kept.
 */
export const leaderboardHydration = async () => {
  "use cache: private";
  cacheTag(GAMES.CACHE.TAG);
  cacheLife(GAMES.CACHE.LIFE);
  const client = sessionApi(await readSessionCookie());
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(leaderboardKey, await fetchLeaderboard(client));
  return dehydrate(queryClient);
};
