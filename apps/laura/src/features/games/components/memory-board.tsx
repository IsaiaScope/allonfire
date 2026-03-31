"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Clock, MousePointerClick, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsViewer } from "@/components/user-role-provider";
import type { MemoryCard as MemoryCardType } from "@/features/games/actions/games";
import { useMemoryGame } from "@/features/games/hooks/use-memory-game";
import { useMemoryGridSize } from "@/features/games/hooks/use-memory-grid-size";
import { formatTime } from "@/features/games/utils/format-time";
import { GameCompleteDialog } from "./game-complete-dialog";
import { MemoryCard } from "./memory-card";

type MemoryBoardProps = {
  initialCards: MemoryCardType[];
  bestTimeMs: number | null;
};

export function MemoryBoard({ initialCards, bestTimeMs }: MemoryBoardProps) {
  const t = useTranslations("Games");
  const isViewer = useIsViewer();
  const {
    cards,
    gameState,
    moves,
    elapsedMs,
    submitState,
    isNewBest,
    flipCard,
    resetGame,
    retrySubmit,
  } = useMemoryGame(initialCards, { isViewer });

  const { ref, gridSize } = useMemoryGridSize();
  const { cols, rows, gap, cardSize, ready } = gridSize;

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-2 sm:max-w-2xl sm:gap-4 lg:max-w-3xl">
      <div
        aria-live="polite"
        className="mx-auto flex w-full shrink-0 items-center justify-between"
        style={
          ready ? { maxWidth: cols * cardSize + (cols - 1) * gap } : undefined
        }
      >
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl tracking-tight sm:text-2xl">
            {t("memoryTitle")}
          </h1>
          {bestTimeMs !== null && (
            <span className="flex items-center gap-1 font-mono font-semibold text-amber-400 text-sm tabular-nums">
              <Trophy className="size-3.5" />
              {formatTime(bestTimeMs)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-medium text-sm sm:gap-4 sm:text-base">
          <span className="flex items-center gap-1.5 font-mono tabular-nums">
            <Clock className="size-4 text-muted-foreground" />
            {formatTime(elapsedMs)}
          </span>
          <span className="flex items-center gap-1.5 font-mono tabular-nums">
            <MousePointerClick className="size-4 text-muted-foreground" />
            {moves}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1" ref={ref}>
        <div
          className={cn(
            "h-full transition-opacity duration-150",
            ready ? "opacity-100" : "opacity-0"
          )}
          style={
            ready
              ? {
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, ${cardSize}px)`,
                  gridTemplateRows: `repeat(${rows}, ${cardSize}px)`,
                  gap: `${gap}px`,
                  placeContent: "center",
                }
              : undefined
          }
        >
          {cards.map((card) => (
            <MemoryCard
              blurDataURL={card.blurDataURL}
              disabled={gameState === "checking" || gameState === "complete"}
              index={card.index}
              isFlipped={card.isFlipped}
              isMatched={card.isMatched}
              key={card.cardId}
              onFlip={() => flipCard(card.index)}
              thumbnailUrl={card.thumbnailUrl}
            />
          ))}
        </div>
      </div>

      <GameCompleteDialog
        elapsedMs={elapsedMs}
        isNewBest={isNewBest}
        moves={moves}
        onPlayAgain={resetGame}
        onRetrySubmit={retrySubmit}
        open={gameState === "complete"}
        submitState={submitState}
      />
    </div>
  );
}
