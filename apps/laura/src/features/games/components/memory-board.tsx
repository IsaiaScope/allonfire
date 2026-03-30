"use client";

import { Clock, MousePointerClick } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MemoryCard as MemoryCardType } from "@/features/games/actions/games";
import { useMemoryGame } from "@/features/games/hooks/use-memory-game";
import { GameCompleteDialog } from "./game-complete-dialog";
import { MemoryCard } from "./memory-card";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

type MemoryBoardProps = {
  initialCards: MemoryCardType[];
};

export function MemoryBoard({ initialCards }: MemoryBoardProps) {
  const t = useTranslations("Games");
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
  } = useMemoryGame(initialCards);

  return (
    <div className="space-y-4">
      {/* Timer and moves */}
      <div
        aria-live="polite"
        className="flex items-center justify-center gap-6"
      >
        <div className="flex items-center gap-2 font-medium text-sm">
          <Clock className="size-4 text-muted-foreground" />
          <span className="w-20 font-mono tabular-nums">
            {formatTime(elapsedMs)}
          </span>
        </div>
        <div className="flex items-center gap-2 font-medium text-sm">
          <MousePointerClick className="size-4 text-muted-foreground" />
          <span className="font-mono tabular-nums">
            {moves} {t("moves")}
          </span>
        </div>
      </div>

      {/* 4x4 grid */}
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-3">
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

      {/* Game complete dialog */}
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
