"use client";

import { Button } from "@allonfire/ui/components/button";
import { cn } from "@allonfire/ui/lib/utils";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsViewer } from "@/components/user-role-provider";
import type { QuizQuestionData } from "@/features/games/actions/quiz";
import { useQuizGame } from "@/features/games/hooks/use-quiz-game";
import { formatTime } from "@/features/games/utils/format-time";
import { correctBounce, wrongShake } from "@/lib/animation-variants";
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
};

export function QuizBoard({ initialQuestions }: QuizBoardProps) {
  const t = useTranslations("Games");
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

  if (gameState === "complete") {
    return (
      <QuizResults
        correctCount={correctCount}
        elapsedMs={elapsedMs}
        isNewBest={isNewBest}
        mistakes={mistakes}
        onPlayAgain={resetGame}
        onRetrySubmit={retrySubmit}
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
      {/* Header: progress + timer */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {t("quizProgress", {
            current: currentIndex + 1,
            total: totalQuestions,
          })}
        </span>
        <span className="flex items-center gap-1.5 font-medium font-mono text-sm tabular-nums">
          <Clock className="size-4 text-muted-foreground" />
          {formatTime(elapsedMs)}
        </span>
      </div>

      {/* Progress bar */}
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
  );
}
