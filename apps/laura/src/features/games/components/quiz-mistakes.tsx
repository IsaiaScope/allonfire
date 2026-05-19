"use client";

import { Button } from "@allonfire/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type MistakeAnswer = {
  text: string;
  imageUrl: string | null;
  blurDataURL: string | null;
};

type QuizMistakesProps = {
  mistakes: {
    questionText: string;
    questionIndex: number;
    questionImageUrl: string | null;
    questionBlurDataURL: string | null;
    selectedAnswerText: string;
    selectedAnswerImageUrl: string | null;
    selectedAnswerBlurDataURL: string | null;
    correctAnswerText: string;
    correctAnswerImageUrl: string | null;
    correctAnswerBlurDataURL: string | null;
  }[];
  totalQuestions: number;
  onBack: () => void;
};

function AnswerCard({
  answer,
  label,
  variant,
}: {
  answer: MistakeAnswer;
  label: string;
  variant: "wrong" | "correct";
}) {
  const borderClass =
    variant === "wrong"
      ? "border-destructive/30 bg-destructive/5"
      : "border-green-500/30 bg-green-500/5";
  const colorClass =
    variant === "wrong"
      ? "text-destructive"
      : "text-green-600 dark:text-green-400";

  return (
    <div className={`flex-1 overflow-hidden rounded-lg border ${borderClass}`}>
      {answer.imageUrl && (
        <div className="relative aspect-4/3 w-full bg-muted">
          <Image
            alt={answer.text}
            blurDataURL={answer.blurDataURL ?? undefined}
            className="object-contain"
            fill
            placeholder={answer.blurDataURL ? "blur" : "empty"}
            sizes="(max-width: 640px) 40vw, 200px"
            src={answer.imageUrl}
          />
        </div>
      )}
      <div className="px-3 py-2">
        <p className={`text-[10px] ${colorClass}`}>{label}</p>
        <p className={`line-clamp-5 break-all text-sm ${colorClass}`}>
          {answer.text}
        </p>
      </div>
    </div>
  );
}

export function QuizMistakes({
  mistakes,
  totalQuestions,
  onBack,
}: QuizMistakesProps) {
  const t = useTranslations("Games");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-2">
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
            {mistake.questionImageUrl && (
              <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  alt=""
                  blurDataURL={mistake.questionBlurDataURL ?? undefined}
                  className="object-contain"
                  fill
                  placeholder={mistake.questionBlurDataURL ? "blur" : "empty"}
                  sizes="(max-width: 640px) 100vw, 500px"
                  src={mistake.questionImageUrl}
                />
              </div>
            )}
            <p className="mb-3 font-medium text-sm">{mistake.questionText}</p>
            <div className="flex gap-2">
              <AnswerCard
                answer={{
                  text: mistake.selectedAnswerText,
                  imageUrl: mistake.selectedAnswerImageUrl,
                  blurDataURL: mistake.selectedAnswerBlurDataURL,
                }}
                label={t("quizYourAnswer")}
                variant="wrong"
              />
              <AnswerCard
                answer={{
                  text: mistake.correctAnswerText,
                  imageUrl: mistake.correctAnswerImageUrl,
                  blurDataURL: mistake.correctAnswerBlurDataURL,
                }}
                label={t("quizCorrectAnswer")}
                variant="correct"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
