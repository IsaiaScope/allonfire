import { AOFDataTableSkeleton } from "@allonfire/ui/features/data-table/components/aof-data-table-skeleton";
import {
  AOFCard,
  AOFCardContent,
} from "@allonfire/ui/shared/components/aof-card";
import { ink } from "@allonfire/ui/shared/utils/skeleton-ink";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import { GAMES } from "../constants/games";
import { playerCard } from "./leaderboard-card-styles";
import { podiumBox, step } from "./leaderboard-podium-styles";
import { statGrid, statTile } from "./leaderboard-stats-styles";

const COLUMNS = 5;
/** The player cards a phone gets in place of the table. */
const CARDS = 3;
const TILES = Array.from(
  { length: GAMES.LEADERBOARD.STATS_PER_GROUP },
  (_, index) => index
);
const GROUPS = ["me", "everyone"] as const;
/** The podium's places, left to right: second, first, third. */
const PLACES = [2, 1, 3] as const;

/** A player's card as the loaded one is sized: a face and a name over two chips and a day. */
const cardOf = () => (
  <AOFCard className={playerCard()} foot size="sm">
    <AOFCardContent className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className={cn(ink({ tone: "faint" }), "h-9 w-8")} />
        <div className={cn(ink({ tone: "faint" }), "size-10.5 rounded-md")} />
        <div className={cn(ink({ tone: "faint" }), "h-4 w-32")} />
      </div>
      <div className="flex items-center gap-2">
        <div className={cn(ink({ tone: "faint" }), "h-6 w-12 rounded-sm")} />
        <div className={cn(ink({ tone: "faint" }), "h-6 w-20 rounded-sm")} />
        <div className={cn(ink({ tone: "faint" }), "ml-auto h-4 w-28")} />
      </div>
    </AOFCardContent>
  </AOFCard>
);

/**
 * The leaderboard before its body arrives: the two columns of tiles' shape, the
 * heading, the podium's three steps, then the table's own skeleton (the table's
 * box is the same size whatever rows it holds, so nothing moves when they
 * arrive; its browser test checks). Heard as one status; its parts are not
 * read.
 */
export const LeaderboardSkeleton = () => {
  const t = useTranslations("Games");
  return (
    <div
      aria-busy
      className="flex min-h-0 flex-1 flex-col gap-4"
      data-skeleton="leaderboard"
    >
      <div aria-hidden className="grid grid-cols-2 gap-3">
        {GROUPS.map((group) => (
          <div className="flex min-w-0 flex-col gap-2" key={group}>
            <div className={cn(ink({ tone: "faint" }), "h-7 w-24")} />
            <div className={statGrid()}>
              {TILES.map((tile) => (
                <div
                  className={cn(statTile(), ink({ tone: "faint" }))}
                  key={tile}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div aria-hidden className={cn(ink({ tone: "faint" }), "h-7 w-24")} />
        <div aria-hidden className={podiumBox()}>
          {PLACES.map((place) => (
            <div
              className={cn(step({ place }), ink({ tone: "faint" }))}
              key={place}
            />
          ))}
        </div>
        <AOFDataTableSkeleton
          card={cardOf}
          cards={CARDS}
          columns={COLUMNS}
          label={t("loading")}
        />
      </div>
    </div>
  );
};
