import { formatTime } from "@allonfire/core/shared/utils/format-time";
import type { OceanArtKey } from "@allonfire/design/designs/ocean/mascot-art";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconClick,
  IconClock,
  IconDeviceGamepad2,
  IconHourglass,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { OceanArt } from "@/shared/components/ocean-art";
import { SeaLine } from "@/shared/components/sea-line";
import { MASCOT } from "@/shared/constants/mascots";
import type { LeaderboardResult } from "../utils/leaderboard-queries";
import { badgeTone, iconTone, type Tone } from "../utils/tone";
import { statGrid, statTile } from "./leaderboard-stats-styles";

const NONE = "—";

/** A time, or a dash when nobody has one yet. */
const timeOrNone = (ms: number | null) => (ms === null ? NONE : formatTime(ms));
/** A count, or a dash when there is none. */
const numberOrNone = (value: number | null) =>
  value === null ? NONE : String(value);

/**
 * One figure on a tinted tile, the sea line faint along its foot: its colour picture or icon at the left, its
 * label small above the value at the right (the label is cut at the tile's
 * edge, never wrapped, so every tile is the same height and the skeleton can
 * match it).
 */
const Stat = ({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: Tone;
  value: string;
}) => (
  <div className={cn(statTile(), badgeTone({ tone }))}>
    <SeaLine className="absolute inset-x-0 bottom-0 -z-10 h-2 w-full text-foreground/10" />
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center *:size-6",
        iconTone({ tone })
      )}
    >
      {icon}
    </span>
    <div className="ml-auto flex min-w-0 flex-col items-end leading-tight">
      <dt
        className="max-w-full truncate text-muted-foreground text-xs"
        title={label}
      >
        {label}
      </dt>
      <dd className="max-w-full truncate font-medium font-mono text-base tabular-nums">
        {value}
      </dd>
    </div>
  </div>
);

const Group = ({
  art,
  children,
  title,
}: {
  art: OceanArtKey;
  children: ReactNode;
  title: string;
}) => (
  <section aria-label={title} className="flex min-w-0 flex-col gap-2">
    <h2 className="flex items-center gap-2 font-heading font-semibold text-lg">
      <OceanArt art={art} className="size-6 shrink-0" />
      {title}
    </h2>
    <dl className={statGrid()}>{children}</dl>
  </section>
);

/**
 * The caller's own figures and everyone's, two columns side by side and row
 * for row alike (time by time, moves by moves, the mean by the mean, then
 * the place by the players and the games by the games), each
 * figure on a tinted tile with its colour picture or icon (two tiles across a
 * column from `@2xl`). A figure with nothing behind it (nobody has played) is a
 * dash.
 */
export const LeaderboardStats = ({
  me,
  stats,
}: Pick<LeaderboardResult, "me" | "stats">) => {
  const t = useTranslations("Games");
  return (
    <div className="grid grid-cols-2 gap-3">
      <Group art={MASCOT.GAMES.HEADING_YOU} title={t("yourStats")}>
        <Stat
          icon={<IconClock aria-hidden />}
          label={t("bestTime")}
          tone="success"
          value={timeOrNone(me.bestTimeMs)}
        />
        <Stat
          icon={<IconClick aria-hidden />}
          label={t("fewestMoves")}
          tone="primary"
          value={numberOrNone(me.bestMoves)}
        />
        <Stat
          icon={<IconHourglass aria-hidden />}
          label={t("averageTime")}
          tone="success"
          value={timeOrNone(me.averageMs)}
        />
        <Stat
          icon={<OceanArt art={MASCOT.GAMES.BADGE_RANK} />}
          label={t("rank")}
          tone="warning"
          value={numberOrNone(me.rank)}
        />
        <Stat
          icon={<IconDeviceGamepad2 aria-hidden />}
          label={t("gamesPlayed")}
          tone="primary"
          value={String(me.totalGames)}
        />
      </Group>
      <Group art={MASCOT.GAMES.HEADING_EVERYONE} title={t("globalStats")}>
        <Stat
          icon={<OceanArt art={MASCOT.GAMES.BADGE_RECORD} />}
          label={t("bestTime")}
          tone="warning"
          value={timeOrNone(stats.fastestMs)}
        />
        <Stat
          icon={<IconClick aria-hidden />}
          label={t("fewestMoves")}
          tone="primary"
          value={numberOrNone(stats.fewestMoves)}
        />
        <Stat
          icon={<IconHourglass aria-hidden />}
          label={t("averageTime")}
          tone="success"
          value={timeOrNone(stats.averageMs)}
        />
        <Stat
          icon={<IconUsers aria-hidden />}
          label={t("uniquePlayers")}
          tone="primary"
          value={String(stats.uniquePlayers)}
        />
        <Stat
          icon={<IconDeviceGamepad2 aria-hidden />}
          label={t("gamesPlayed")}
          tone="primary"
          value={String(stats.totalGames)}
        />
      </Group>
    </div>
  );
};
