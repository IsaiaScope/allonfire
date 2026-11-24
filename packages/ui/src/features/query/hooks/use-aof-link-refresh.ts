"use client";

import { invalidateStatic } from "@allonfire/core/features/next/query/utils/invalidate-static";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** How often a visible page checks how old its links are. */
const CHECK_EVERY_MS = UNIT.MS_PER_MINUTE;

/**
 * Keeps the signed links of the queries under `queryKey` from ending on a page
 * left open. While the tab is visible, once a minute and when it becomes
 * visible or the network returns, it reads them again if the oldest data is at
 * least `refreshMs` old, through core's `invalidateStatic` (`refetchQueries`
 * skips a `static` query). The old data keeps showing until the new arrives.
 */
export const useAOFLinkRefresh = ({
  queryKey,
  refreshMs,
}: {
  queryKey: QueryKey;
  refreshMs: number;
}): void => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refreshWhenOld = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const updated = queryClient
        .getQueryCache()
        .findAll({ queryKey })
        .filter((query) => query.isActive())
        .map((query) => query.state.dataUpdatedAt);
      if (updated.length === 0) {
        return;
      }
      if (Date.now() - Math.min(...updated) >= refreshMs) {
        // A read that fails is the query's own to report (its error caches).
        invalidateStatic(queryClient, queryKey).catch(() => undefined);
      }
    };
    const timer = setInterval(refreshWhenOld, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", refreshWhenOld);
    window.addEventListener("online", refreshWhenOld);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenOld);
      window.removeEventListener("online", refreshWhenOld);
    };
  }, [queryClient, queryKey, refreshMs]);
};
