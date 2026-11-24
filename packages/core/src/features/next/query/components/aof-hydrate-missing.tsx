"use client";

import {
  type DehydratedState,
  HydrationBoundary,
  useQueryClient,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * `HydrationBoundary` that hydrates only the queries this browser does not
 * hold yet. A page that renders again after an action (`updateTag` refreshes
 * the route) hands over a newer first page of every feed; hydrating it would
 * replace a feed's loaded pages with that first page. Once the browser holds a
 * query, only a mutation's invalidation and the link refresh change it.
 */
export const AOFHydrateMissing = ({
  children,
  state,
}: {
  children: ReactNode;
  state: DehydratedState | undefined;
}) => {
  const queryCache = useQueryClient().getQueryCache();
  const missing: DehydratedState | undefined = state && {
    ...state,
    queries: state.queries.filter(
      ({ queryHash }) => !queryCache.get(queryHash)
    ),
  };
  return <HydrationBoundary state={missing}>{children}</HydrationBoundary>;
};
