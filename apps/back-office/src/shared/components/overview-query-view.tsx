"use client";

import { AOFQueryView } from "@allonfire/ui/features/query/components/aof-query-view";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  type OverviewCardStateProps,
  OverviewFailed,
  OverviewForbidden,
} from "@/shared/components/overview-card-state";

/**
 * A Home overview's read as a `AOFQueryView`, with its two refusals drawn as
 * cards of the `card`'s size (and title, when the card knows it before it
 * reads), so nothing moves between the skeleton, the data and these. The
 * overview gives their `words`: for a 403, for a failure, and for its retry.
 */
export const OverviewQueryView = <T,>({
  card,
  children,
  query,
  skeleton,
  words,
}: {
  card: Omit<OverviewCardStateProps, "text">;
  children: (data: T) => ReactNode;
  query: Pick<UseQueryResult<T, unknown>, "data" | "error" | "refetch">;
  skeleton: ReactNode;
  words: { failed: string; forbidden: string; retry: string };
}) => {
  const failed = (retry: () => void) => (
    <OverviewFailed
      {...card}
      retry={retry}
      retryText={words.retry}
      text={words.failed}
    />
  );
  return (
    <AOFQueryView
      failed={failed}
      forbidden={<OverviewForbidden {...card} text={words.forbidden} />}
      query={query}
      skeleton={skeleton}
    >
      {children}
    </AOFQueryView>
  );
};
