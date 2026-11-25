"use client";

import { formatTime } from "@allonfire/core/shared/utils/format-time";
import {
  AOFDataTable,
  type AOFRow,
  aofColumnHelper,
  useAOFTable,
} from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useDayFormat } from "@allonfire/ui/features/data-table/hooks/use-day-format";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { LeaderboardEntry } from "../utils/leaderboard-queries";
import { GamesNotice } from "./games-notice";
import { LeaderboardCard } from "./leaderboard-card";
import { LeaderboardPlayer } from "./leaderboard-player";
import { RankBadge } from "./rank-badge";

const columns = aofColumnHelper<LeaderboardEntry>();
/** A value centred in its column, as the place and the figures are. */
const centred = cva("block text-center");
/** The day a game was played, as `YYYY-MM-DD`. */
const dayOf = ({ playedAt }: LeaderboardEntry) => playedAt.slice(0, 10);

/** A row as a card, below `md`. */
const card = (row: AOFRow<LeaderboardEntry>) => (
  <LeaderboardCard entry={row.original} />
);

/**
 * The ranked players, as a table from `md` and as a card each below it (as the
 * Back Office's lists): the player's name shortens first. The figures' columns
 * are as wide as what they hold, from a small floor, so the table fits the
 * room a tablet leaves beside the folded sidebar (about 616px) without
 * scrolling sideways.
 * Nothing sorts or pages: the API sends the top in order, the rank is its own
 * place. An empty list says that no game has been played.
 */
export const LeaderboardTable = ({
  entries,
}: {
  entries: LeaderboardEntry[];
}) => {
  const t = useTranslations("Games");
  const day = useDayFormat();
  const defs = useMemo(
    () => [
      columns.display({
        cell: ({ row }) => (
          <span className="flex justify-center">
            <RankBadge rank={row.original.rank} />
          </span>
        ),
        enableSorting: false,
        header: () => <span className={centred()}>{t("rank")}</span>,
        id: "rank",
        maxSize: 112,
        minSize: 72,
      }),
      columns.display({
        cell: ({ row }) => <LeaderboardPlayer entry={row.original} />,
        enableSorting: false,
        header: () => t("player"),
        id: "player",
        // As the Back Office's users: a long name is cut to an ellipsis down
        // to 200px, the figures beside it never pushed out.
        maxSize: 480,
        minSize: 200,
      }),
      columns.display({
        cell: ({ row }) => (
          <span className={cn(centred(), "font-mono tabular-nums")}>
            {row.original.moves}
          </span>
        ),
        enableSorting: false,
        header: () => <span className={centred()}>{t("moves")}</span>,
        id: "moves",
        maxSize: 88,
        minSize: 64,
      }),
      columns.display({
        cell: ({ row }) => (
          <span className={cn(centred(), "font-mono tabular-nums")}>
            {formatTime(row.original.timeMs)}
          </span>
        ),
        enableSorting: false,
        header: () => <span className={centred()}>{t("time")}</span>,
        id: "time",
        maxSize: 112,
        minSize: 80,
      }),
      columns.display({
        cell: ({ row }) => (
          <span className={centred()}>{day(dayOf(row.original))}</span>
        ),
        enableSorting: false,
        header: () => <span className={centred()}>{t("date")}</span>,
        id: "date",
        maxSize: 160,
        minSize: 112,
      }),
    ],
    [day, t]
  );
  const table = useAOFTable<LeaderboardEntry>({
    columns: defs,
    data: entries,
    getRowId: ({ rank }) => String(rank),
    manualPagination: true,
  });
  return (
    <AOFDataTable
      card={card}
      fill={["player"]}
      label={t("leaderboardLabel")}
      states={{ empty: <GamesNotice kind="noScores" /> }}
      table={table}
    />
  );
};
