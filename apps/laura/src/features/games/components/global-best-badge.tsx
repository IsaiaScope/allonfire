"use client";

import { formatTime } from "@allonfire/core/shared/utils/format-time";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconClick, IconClock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { OceanArt } from "@/shared/components/ocean-art";
import { MASCOT } from "@/shared/constants/mascots";
import { leaderboardQuery } from "../utils/leaderboard-queries";
import { badgeTone } from "../utils/tone";
import { StatValue, statBadge } from "./board-stat";

/**
 * The best game on the leaderboard, by the board, as the header's own badges
 * are: the colour trophy, then its moves and its time each on a chip, from the
 * leaderboard's first row, at every width. Each chip names itself on hover
 * (Moves, Time), the pointer over it; the trophy needs no words. Nothing shows
 * while there is none, or when the read failed or is refused: the game plays
 * all the same.
 */
export const GlobalBestBadge = ({ className }: { className?: string }) => {
  const t = useTranslations("Games");
  const { data } = useQuery(leaderboardQuery(api));
  const best = data?.entries[0];
  if (!best) {
    return null;
  }
  const time = formatTime(best.timeMs);
  return (
    <dl className={className}>
      <AOFBadge
        className={cn(statBadge(), badgeTone({ tone: "warning" }))}
        render={<div />}
        variant="secondary"
      >
        <OceanArt art={MASCOT.GAMES.BADGE_RECORD} className="size-4" />
        <dt className="sr-only">
          {t("bestGame", { moves: best.moves, time })}
        </dt>
        <AOFTooltip label={t("moves")}>
          <StatValue className="cursor-pointer" tone="warning">
            <IconClick aria-hidden />
            {best.moves}
          </StatValue>
        </AOFTooltip>
        <AOFTooltip label={t("time")}>
          <StatValue className="cursor-pointer" tone="warning">
            <IconClock aria-hidden />
            {time}
          </StatValue>
        </AOFTooltip>
      </AOFBadge>
    </dl>
  );
};
