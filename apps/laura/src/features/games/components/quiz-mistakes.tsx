"use client";

import { Button } from "@allonfire/ui/components/button";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

type QuizMistakesProps = {
  mistakes: {
    questionText: string;
    questionIndex: number;
    selectedAnswerText: string;
    correctAnswerText: string;
  }[];
  totalQuestions: number;
  onBack: () => void;
};

export function QuizMistakes({
  mistakes,
  totalQuestions,
  onBack,
}: QuizMistakesProps) {
  const t = useTranslations("Games");

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 py-4">
      <div className="flex items-center gap-2">
        <Button className="size-8" onClick={onBack} size="icon" variant="ghost">
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold text-base">
          {t("quizMistakesTitle", {
            count: mistakes.length,
            total: totalQuestions,
          })}
        </h3>
      </div>

      <div className="space-y-3">
        {mistakes.map((mistake) => (
          <div
            className="rounded-xl border border-border bg-muted/30 p-4"
            key={mistake.questionIndex}
          >
            <p className="mb-1 text-muted-foreground text-xs">
              {t("quizQuestionNumber", { number: mistake.questionIndex + 1 })}
            </p>
            <p className="mb-3 font-medium text-sm">{mistake.questionText}</p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-[10px] text-destructive">
                  {t("quizYourAnswer")}
                </p>
                <p className="text-destructive text-sm">
                  {mistake.selectedAnswerText}
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2">
                <p className="text-[10px] text-green-600 dark:text-green-400">
                  {t("quizCorrectAnswer")}
                </p>
                <p className="text-green-600 text-sm dark:text-green-400">
                  {mistake.correctAnswerText}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
