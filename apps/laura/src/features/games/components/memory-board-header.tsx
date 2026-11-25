import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconClick, IconClock, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ActionArt } from "@/shared/components/action-art";
import { COMPACT_ACTION } from "@/shared/components/action-dressing";
import { MASCOT } from "@/shared/constants/mascots";
import { BoardStat } from "./board-stat";

/**
 * The row above the cards: moves and time as icon badges (a tooltip names
 * each), the New game action, and
 * whatever `best` holds at the far right. The board and its skeleton draw this
 * same row, so the skeleton is the header as it will be, not a grey guess at
 * it: sizes, icons, tints and the action's picture all match. `inert` makes
 * it a picture of the header (no focus, no click, hidden from a screen
 * reader) and pulses it softly while the deck is on its way.
 */
export const MemoryBoardHeader = ({
  best,
  clock,
  inert,
  moves,
  onNewGame,
}: {
  best?: ReactNode;
  /** The time, ready drawn: the board's live clock, or a still `formatTime(0)`. */
  clock: ReactNode;
  inert?: boolean;
  moves: number;
  onNewGame?: () => void;
}) => {
  const t = useTranslations("Games");
  return (
    <div
      aria-hidden={inert}
      className={cn(
        "scrollbar-none flex h-9 items-center @4xl:gap-2 gap-1 overflow-x-auto *:shrink-0 [&::-webkit-scrollbar]:hidden",
        inert && "pointer-events-none opacity-60 motion-safe:animate-pulse"
      )}
      inert={inert}
    >
      <dl className="flex items-center @4xl:gap-2 gap-1">
        <AOFTooltip label={t("moves")}>
          <BoardStat
            className="cursor-pointer"
            icon={<IconClick aria-hidden />}
            iconOnly
            label={t("moves")}
            tone="primary"
          >
            {moves}
          </BoardStat>
        </AOFTooltip>
        <AOFTooltip label={t("time")}>
          <BoardStat
            className="cursor-pointer"
            icon={<IconClock aria-hidden />}
            iconOnly
            label={t("time")}
            tone="success"
            valueProps={{ role: "timer" }}
          >
            {clock}
          </BoardStat>
        </AOFTooltip>
      </dl>
      <AOFButton
        className={cn(COMPACT_ACTION.className, "@max-xl:w-8 @max-xl:px-0")}
        onClick={onNewGame}
        size="sm"
      >
        <IconRefresh aria-hidden />
        <span className="sr-only">{t("newGame")}</span>
        <span aria-hidden className="@max-xl:hidden">
          {t("newGameShort")}
        </span>
        <ActionArt
          art={MASCOT.ACTION.save}
          className="@max-xl:right-1/2 right-1 @max-xl:size-7 size-5 @max-xl:translate-x-1/2"
        />
      </AOFButton>
      {best}
    </div>
  );
};
