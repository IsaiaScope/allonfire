"use client";

import { LAURA as API_LAURA } from "@allonfire/api/features/laura/constants/laura";
import { AOFQueryView } from "@allonfire/ui/features/query/components/aof-query-view";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { OceanArt } from "@/shared/components/ocean-art";
import { MASCOT } from "@/shared/constants/mascots";
import { leaderboardQuery } from "../utils/leaderboard-queries";
import { GamesNotice } from "./games-notice";
import { LeaderboardPodium } from "./leaderboard-podium";
import { LeaderboardSkeleton } from "./leaderboard-skeleton";
import { LeaderboardStats } from "./leaderboard-stats";
import { LeaderboardTable } from "./leaderboard-table";

const leaderboardFailed = (retry: () => void) => (
  <GamesNotice kind="leaderboardFailed" onRetry={retry} />
);

/**
 * The leaderboard: the caller's place and everyone's totals, then the top
 * ten: the first three on a podium, all ten in the table below. Hydrated by the page, read back here under the same key. A first
 * load that failed tells it on the page, with a retry (never a toast: nothing
 * else is on screen); a visitor Laura is closed to is told so.
 */
export const LeaderboardView = () => {
  const t = useTranslations("Games");
  const query = useQuery(leaderboardQuery(api));
  return (
    <AOFQueryView
      failed={leaderboardFailed}
      forbidden={<GamesNotice kind="forbidden" />}
      query={query}
      skeleton={<LeaderboardSkeleton />}
    >
      {({ entries, me, stats }) => (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <LeaderboardStats me={me} stats={stats} />
          <section className="flex min-h-0 flex-1 flex-col gap-3">
            <h2 className="flex items-center gap-2 font-heading font-semibold text-lg">
              <OceanArt
                art={MASCOT.GAMES.BADGE_RECORD}
                className="size-6 shrink-0"
              />
              {t("topTitle", { count: API_LAURA.GAMES.LIMIT.LEADERBOARD_TOP })}
            </h2>
            <LeaderboardPodium entries={entries} />
            <LeaderboardTable entries={entries} />
          </section>
        </div>
      )}
    </AOFQueryView>
  );
};
