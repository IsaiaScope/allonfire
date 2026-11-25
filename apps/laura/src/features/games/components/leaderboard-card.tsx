import { useDayFormat } from "@allonfire/ui/features/data-table/hooks/use-day-format";
import {
  AOFCard,
  AOFCardContent,
} from "@allonfire/ui/shared/components/aof-card";
import { IconCalendar } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { ActionArt } from "@/shared/components/action-art";
import { MASCOT } from "@/shared/constants/mascots";
import type { LeaderboardEntry } from "../utils/leaderboard-queries";
import { MovesChip, TimeChip } from "./figure-chips";
import { playerCard } from "./leaderboard-card-styles";
import { LeaderboardPlayer } from "./leaderboard-player";
import { RankBadge } from "./rank-badge";

/** The sea creatures the buttons wear, one after another down the list. */
const CREATURES = [
  MASCOT.ACTION.save,
  MASCOT.ACTION.enter,
  MASCOT.ACTION.retry,
  MASCOT.ACTION.back,
] as const;

/**
 * A player on a phone, as the table's row is from `md`: their place and who
 * they are on the first line, then moves and time on their chips and the day
 * they played, wrapping to the next line when the card is narrow. A sea creature, as the
 * buttons wear, runs faint behind it and the card's foot is a line in the
 * primary colour, as the Back Office's cards have one in their line's; the caller is told by the badge beside their name.
 */
export const LeaderboardCard = ({ entry }: { entry: LeaderboardEntry }) => {
  const t = useTranslations("Games");
  const day = useDayFormat();
  return (
    <AOFCard
      className={playerCard()}
      data-slot="leaderboard-card"
      foot
      size="sm"
    >
      <ActionArt
        art={
          CREATURES[(entry.rank - 1) % CREATURES.length] ?? MASCOT.ACTION.save
        }
        className="right-3 size-14 text-current/15"
      />
      <AOFCardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <RankBadge large rank={entry.rank} />
          <LeaderboardPlayer entry={entry} large />
        </div>
        <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <MovesChip moves={entry.moves} />
          <TimeChip timeMs={entry.timeMs} tone="success" />
          <dt className="sr-only">{t("date")}</dt>
          <dd className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <IconCalendar aria-hidden className="size-4" />
            {day(entry.playedAt.slice(0, 10))}
          </dd>
        </dl>
      </AOFCardContent>
    </AOFCard>
  );
};
