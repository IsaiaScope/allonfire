"use client";

import { Button } from "@allonfire/ui/components/button";
import { cn } from "@allonfire/ui/lib/utils";
import { Clock, MousePointerClick, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIsViewer } from "@/components/user-role-provider";
import type {
  GlobalBest,
  MemoryCard as MemoryCardType,
} from "@/features/games/actions/games";
import { useGameReset } from "@/features/games/hooks/use-game-reset";
import { useMemoryGame } from "@/features/games/hooks/use-memory-game";
import { useMemoryGridSize } from "@/features/games/hooks/use-memory-grid-size";
import { formatTime } from "@/features/games/utils/format-time";
import { GameCompleteDialog } from "./game-complete-dialog";
import { GlobalBestBadge } from "./global-best-badge";
import { MemoryCard } from "./memory-card";

type MemoryBoardProps = {
  initialCards: MemoryCardType[];
  globalBest: GlobalBest | null;
};

export function MemoryBoard({ initialCards, globalBest }: MemoryBoardProps) {
  const t = useTranslations("Games");
  const router = useRouter();
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

  const { isResetting, handleReset } = useGameReset(resetGame);

  const { ref, gridSize } = useMemoryGridSize();
  const { cols, rows, gap, cardSize, ready } = gridSize;

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-2 sm:max-w-2xl sm:gap-4 lg:max-w-3xl">
      <div
        aria-live="polite"
        className="mx-auto flex w-full shrink-0 flex-col gap-1"
        style={
          ready ? { maxWidth: cols * cardSize + (cols - 1) * gap } : undefined
        }
      >
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl tracking-tight sm:text-2xl">
            {t("memoryTitle")}
          </h1>
          <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
            <Button
              className={cn(
                "mr-1 gap-1 sm:mr-2",
                (gameState === "idle" || gameState === "complete") &&
                  "pointer-events-none invisible"
              )}
              onClick={handleReset}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">{t("refresh")}</span>
            </Button>
            <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono tabular-nums">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              {formatTime(elapsedMs)}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono tabular-nums">
              <MousePointerClick className="size-3.5 shrink-0 text-muted-foreground" />
              {moves}
            </span>
          </div>
        </div>
        <GlobalBestBadge
          globalBest={globalBest}
          scoreIcon={MousePointerClick}
        />
      </div>

      <div className="min-h-0 flex-1" ref={ref}>
        <div
          className={cn(
            "h-full transition-opacity duration-200",
            ready && !isResetting ? "opacity-100" : "opacity-0"
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
        onPlayAgain={handleReset}
        onRetrySubmit={retrySubmit}
        onViewLeaderboard={() => {
          router.push("/games/memory/leaderboard");
          router.refresh();
        }}
        open={gameState === "complete"}
        submitState={submitState}
      />
    </div>
  );
}
