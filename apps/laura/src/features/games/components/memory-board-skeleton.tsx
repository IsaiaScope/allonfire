import { formatClock } from "@allonfire/core/shared/utils/format-time";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { useTranslations } from "next-intl";
import { CardBack } from "./card-back";
import { MemoryBoardHeader } from "./memory-board-header";
import { MemoryGrid } from "./memory-grid";

const SLOTS = Array.from(
  { length: MEMORY_RULE.CARDS },
  (_, index) => `slot-${index + 1}`
);

/** One card back where a card will stand. */
const slots = SLOTS.map((slot) => (
  <div
    aria-hidden
    className="overflow-hidden rounded-lg border bg-secondary opacity-60 motion-safe:animate-pulse dark:bg-card"
    key={slot}
  >
    <CardBack />
  </div>
));

/**
 * The board before its deck arrives: the real header as a picture (a game at
 * its start: no moves, no time) and the same grid as the real one, twelve card
 * backs where the cards will stand, so nothing moves
 * when they arrive (its browser test compares the two at three sizes). Heard as
 * one status; its parts are not read.
 */
export const MemoryBoardSkeleton = () => {
  const t = useTranslations("Games");
  return (
    <div
      aria-busy
      className="flex min-h-0 flex-1 flex-col gap-3 px-2"
      data-skeleton="memory"
      role="status"
    >
      <p className="sr-only">{t("loading")}</p>
      <MemoryGrid
        fallback={slots}
        header={<MemoryBoardHeader clock={formatClock(0)} inert moves={0} />}
      >
        {slots}
      </MemoryGrid>
    </div>
  );
};
