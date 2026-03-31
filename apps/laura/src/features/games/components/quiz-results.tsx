"use client";

import { Button } from "@allonfire/ui/components/button";
import { Loader2, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatTime } from "@/features/games/utils/format-time";
import { QuizMistakes } from "./quiz-mistakes";

type QuizResultsProps = {
  correctCount: number;
  totalQuestions: number;
  elapsedMs: number;
  submitState: "idle" | "submitting" | "success" | "error";
  isNewBest: boolean;
  mistakes: {
    questionText: string;
    questionIndex: number;
    selectedAnswerText: string;
    correctAnswerText: string;
  }[];
  onPlayAgain: () => void;
  onRetrySubmit: () => void;
};

export function QuizResults({
  correctCount,
  totalQuestions,
  elapsedMs,
  submitState,
  isNewBest,
  mistakes,
  onPlayAgain,
  onRetrySubmit,
}: QuizResultsProps) {
  const t = useTranslations("Games");
  const [showMistakes, setShowMistakes] = useState(false);

  const percentage = Math.round((correctCount / totalQuestions) * 100);
  // CSS conic gradient: percentage maps to degrees (360 * fraction)
  const degrees = Math.round((correctCount / totalQuestions) * 360);

  if (showMistakes) {
    return (
      <QuizMistakes
        mistakes={mistakes}
        onBack={() => setShowMistakes(false)}
        totalQuestions={totalQuestions}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
      {/* Score circle */}
      <div
        className="flex size-32 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) 0deg ${degrees}deg, hsl(var(--muted)) ${degrees}deg 360deg)`,
        }}
      >
        <div className="flex size-[104px] flex-col items-center justify-center rounded-full bg-background">
          <span className="font-bold text-3xl text-primary">
            {correctCount}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("quizOf", { total: totalQuestions })}
          </span>
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <h2 className="font-bold text-xl">
          {percentage >= 80 && t("quizGreatJob")}
          {percentage >= 50 && percentage < 80 && t("quizGoodTry")}
          {percentage < 50 && t("quizKeepPracticing")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("quizScoreSummary", {
            correct: correctCount,
            total: totalQuestions,
          })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid w-full grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-4 text-center">
          <p className="font-bold font-mono text-xl">{formatTime(elapsedMs)}</p>
          <p className="text-muted-foreground text-xs">{t("time")}</p>
        </div>
        <div className="rounded-xl bg-muted p-4 text-center">
          {isNewBest ? (
            <>
              <p className="flex items-center justify-center gap-1 font-bold text-amber-400 text-xl">
                <Trophy className="size-4" />
                {t("newRecord")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("personalBest")}
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-xl">{percentage}%</p>
              <p className="text-muted-foreground text-xs">
                {t("quizAccuracy")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Submit status */}
      {submitState === "submitting" && (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          {t("submitting")}
        </p>
      )}
      {submitState === "error" && (
        <div className="flex items-center gap-2">
          <p className="text-destructive text-sm">{t("submitError")}</p>
          <Button onClick={onRetrySubmit} size="sm" variant="outline">
            {t("retry")}
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex w-full flex-col gap-2">
        <Button asChild>
          <Link href="/games/quiz/leaderboard">{t("viewLeaderboard")}</Link>
        </Button>
        {mistakes.length > 0 && (
          <Button onClick={() => setShowMistakes(true)} variant="outline">
            {t("quizShowMistakes", { count: mistakes.length })}
          </Button>
        )}
        <Button onClick={onPlayAgain} variant="ghost">
          {t("playAgain")}
        </Button>
      </div>
    </div>
  );
}
