import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import type { DehydratedState } from "@tanstack/react-query";
import { LeaderboardView } from "./leaderboard-view";

/**
 * The leaderboard with its data already in the browser's cache: the page's own
 * read (`hydration`, kept in the visitor's browser), through the plain
 * boundary (one body with no loaded pages, so a newer copy simply replaces
 * the older). A refused read leaves the view to ask again and say why.
 */
export const LeaderboardPageBody = ({
  hydration,
}: {
  hydration: () => Promise<DehydratedState>;
}) => (
  <AOFHydratedBoundary hydration={hydration}>
    <LeaderboardView />
  </AOFHydratedBoundary>
);
