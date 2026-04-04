"use client";

import { Button } from "@allonfire/ui/components/button";
import { cn } from "@allonfire/ui/lib/utils";
import { motion } from "framer-motion";
import { CircleCheck, Clock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIsViewer } from "@/components/user-role-provider";
import type { GlobalBest } from "@/features/games/actions/games";
import type { QuizQuestionData } from "@/features/games/actions/quiz";
import { useGameReset } from "@/features/games/hooks/use-game-reset";
import { useQuizGame } from "@/features/games/hooks/use-quiz-game";
import { formatTime } from "@/features/games/utils/format-time";
import { correctBounce, wrongShake } from "@/lib/animation-variants";
import { GlobalBestBadge } from "./global-best-badge";
import { QuizQuestion } from "./quiz-question";
import { QuizResults } from "./quiz-results";

function answerFeedbackAnimation(result: "correct" | "wrong" | null) {
  if (result === "correct") {
    return correctBounce;
  }
  if (result === "wrong") {
    return wrongShake;
  }
  return {};
}

type QuizBoardProps = {
  initialQuestions: QuizQuestionData[];
  globalBest: GlobalBest | null;
};

export function QuizBoard({ initialQuestions, globalBest }: QuizBoardProps) {
  const t = useTranslations("Games");
  const router = useRouter();
  const isViewer = useIsViewer();
  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    selectedAnswerId,
    gameState,
    lastAnswerResult,
    elapsedMs,
    submitState,
    isNewBest,
    isTransitioning,
    correctCount,
    mistakes,
    selectAnswer,
    confirmAnswer,
    resetGame,
    retrySubmit,
  } = useQuizGame(initialQuestions, { isViewer });

  const { isResetting, handleReset } = useGameReset(resetGame);

  if (gameState === "complete") {
    return (
      <QuizResults
        correctCount={correctCount}
        elapsedMs={elapsedMs}
        isNewBest={isNewBest}
        mistakes={mistakes}
        onPlayAgain={handleReset}
        onRetrySubmit={retrySubmit}
        onViewLeaderboard={() => {
          router.push("/games/quiz/leaderboard");
          router.refresh();
        }}
        submitState={submitState}
        totalQuestions={totalQuestions}
      />
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="whitespace-nowrap text-muted-foreground text-sm">
            {t("quizProgress", {
              current: currentIndex + 1,
              total: totalQuestions,
            })}
          </span>
          <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
            <Button
              className={cn(
                "mr-1 gap-1 sm:mr-2",
                gameState === "idle" && "pointer-events-none invisible"
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
          </div>
        </div>
        <GlobalBestBadge globalBest={globalBest} scoreIcon={CircleCheck} />
      </div>

      {/* Progress bar + content with reset fade */}
      <div
        className={cn(
          "flex flex-col gap-4 transition-opacity duration-100",
          isResetting ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question area with transition + answer feedback */}
        <motion.div
          animate={answerFeedbackAnimation(lastAnswerResult)}
          key={`feedback-${currentIndex}-${lastAnswerResult}`}
        >
          <div
            className={cn(
              "transition-all duration-200",
              isTransitioning
                ? "translate-x-4 opacity-0"
                : "translate-x-0 opacity-100"
            )}
          >
            <QuizQuestion
              disabled={isTransitioning}
              onSelectAnswer={selectAnswer}
              question={currentQuestion}
              selectedAnswerId={selectedAnswerId}
            />
          </div>
        </motion.div>

        {/* Confirm button */}
        <Button
          className="w-full"
          disabled={!selectedAnswerId || isTransitioning}
          onClick={confirmAnswer}
          size="lg"
        >
          {t("quizConfirmAnswer")}
        </Button>
      </div>
    </div>
  );
}
