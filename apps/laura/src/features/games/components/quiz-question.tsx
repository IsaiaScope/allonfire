"use client";

import { cn } from "@allonfire/ui/lib/utils";
import Image from "next/image";
import type { QuizQuestionData } from "@/features/games/actions/quiz";

type QuizQuestionProps = {
  question: QuizQuestionData;
  selectedAnswerId: string | null;
  onSelectAnswer: (answerId: string) => void;
  disabled: boolean;
};

export function QuizQuestion({
  question,
  selectedAnswerId,
  onSelectAnswer,
  disabled,
}: QuizQuestionProps) {
  const hasImageAnswers = question.answers.some((a) => a.imageUrl);

  return (
    <div className="space-y-4">
      {/* Question image */}
      {question.imageThumbnailUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          <Image
            alt=""
            blurDataURL={question.imageBlurDataURL ?? undefined}
            className="object-contain"
            fill
            placeholder={question.imageBlurDataURL ? "blur" : "empty"}
            sizes="(max-width: 640px) 100vw, 600px"
            src={question.imageThumbnailUrl}
          />
        </div>
      )}

      {/* Question text */}
      <p className="font-medium text-base leading-relaxed sm:text-lg">
        {question.text}
      </p>

      {/* Answers */}
      {hasImageAnswers ? (
        <ImageAnswerGrid
          answers={question.answers}
          disabled={disabled}
          onSelectAnswer={onSelectAnswer}
          selectedAnswerId={selectedAnswerId}
        />
      ) : (
        <TextAnswerList
          answers={question.answers}
          disabled={disabled}
          onSelectAnswer={onSelectAnswer}
          selectedAnswerId={selectedAnswerId}
        />
      )}
    </div>
  );
}

function TextAnswerList({
  answers,
  selectedAnswerId,
  onSelectAnswer,
  disabled,
}: {
  answers: QuizQuestionData["answers"];
  selectedAnswerId: string | null;
  onSelectAnswer: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {answers.map((answer) => {
        const isSelected = selectedAnswerId === answer.id;
        return (
          <button
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
              disabled && "pointer-events-none opacity-60"
            )}
            disabled={disabled}
            key={answer.id}
            onClick={() => onSelectAnswer(answer.id)}
            type="button"
          >
            <span className="line-clamp-5 text-sm sm:text-base">
              {answer.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ImageAnswerGrid({
  answers,
  selectedAnswerId,
  onSelectAnswer,
  disabled,
}: {
  answers: QuizQuestionData["answers"];
  selectedAnswerId: string | null;
  onSelectAnswer: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {answers.map((answer) => {
        const isSelected = selectedAnswerId === answer.id;
        const imageSrc = answer.imageThumbnailUrl;
        return (
          <button
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border transition-all",
              isSelected
                ? "border-primary ring-2 ring-primary"
                : "border-border hover:border-primary/50",
              disabled && "pointer-events-none opacity-60"
            )}
            disabled={disabled}
            key={answer.id}
            onClick={() => onSelectAnswer(answer.id)}
            type="button"
          >
            {imageSrc ? (
              <>
                <div className="relative aspect-4/3 w-full bg-muted">
                  <Image
                    alt={answer.text}
                    blurDataURL={answer.imageBlurDataURL ?? undefined}
                    className="object-contain"
                    fill
                    placeholder={answer.imageBlurDataURL ? "blur" : "empty"}
                    sizes="(max-width: 640px) 45vw, 250px"
                    src={imageSrc}
                  />
                </div>
                <div className="px-3 py-2">
                  <span className="line-clamp-5 break-all text-sm">
                    {answer.text}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-3">
                <span className="line-clamp-5 break-all text-center text-sm">
                  {answer.text}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
