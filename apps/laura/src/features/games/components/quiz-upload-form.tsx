"use client";

import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent } from "@allonfire/ui/components/card";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import { cn } from "@allonfire/ui/lib/utils";
import { Check, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, useTransition } from "react";
import { createQuestionAction } from "@/features/games/actions/quiz";

type AnswerSlot = {
  id: string;
  text: string;
  isCorrect: boolean;
  image: File | null;
  imagePreview: string | null;
};

let nextAnswerId = 0;
function makeAnswerSlot(overrides?: Partial<AnswerSlot>): AnswerSlot {
  return {
    id: `answer-${nextAnswerId++}`,
    text: "",
    isCorrect: false,
    image: null,
    imagePreview: null,
    ...overrides,
  };
}

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/heic,image/heif";

export function QuizUploadForm() {
  const t = useTranslations("Games");
  const [isPending, startTransition] = useTransition();

  const [questionText, setQuestionText] = useState("");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<
    string | null
  >(null);
  const [answers, setAnswers] = useState<AnswerSlot[]>([
    makeAnswerSlot({ isCorrect: true }),
    makeAnswerSlot(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const questionImageRef = useRef<HTMLInputElement>(null);

  const handleQuestionImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setQuestionImage(file);
        setQuestionImagePreview(URL.createObjectURL(file));
      }
      e.target.value = "";
    },
    []
  );

  const removeQuestionImage = useCallback(() => {
    if (questionImagePreview) {
      URL.revokeObjectURL(questionImagePreview);
    }
    setQuestionImage(null);
    setQuestionImagePreview(null);
  }, [questionImagePreview]);

  const updateAnswer = useCallback(
    (index: number, updates: Partial<AnswerSlot>) => {
      setAnswers((prev) =>
        prev.map((a, i) => (i === index ? { ...a, ...updates } : a))
      );
    },
    []
  );

  const setCorrectAnswer = useCallback((index: number) => {
    setAnswers((prev) =>
      prev.map((a, i) => ({ ...a, isCorrect: i === index }))
    );
  }, []);

  const addAnswer = useCallback(() => {
    if (answers.length >= 4) {
      return;
    }
    setAnswers((prev) => [...prev, makeAnswerSlot()]);
  }, [answers.length]);

  const removeAnswer = useCallback(
    (index: number) => {
      if (answers.length <= 2) {
        return;
      }
      setAnswers((prev) => {
        const next = prev.filter((_, i) => i !== index);
        // If we removed the correct answer, make the first one correct
        if (!next.some((a) => a.isCorrect) && next[0]) {
          next[0] = { ...next[0], isCorrect: true };
        }
        return next;
      });
    },
    [answers.length]
  );

  const handleAnswerImage = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        updateAnswer(index, {
          image: file,
          imagePreview: URL.createObjectURL(file),
        });
      }
      e.target.value = "";
    },
    [updateAnswer]
  );

  const removeAnswerImage = useCallback(
    (index: number) => {
      const preview = answers[index]?.imagePreview;
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      updateAnswer(index, { image: null, imagePreview: null });
    },
    [answers, updateAnswer]
  );

  const resetForm = useCallback(() => {
    setQuestionText("");
    removeQuestionImage();
    setAnswers([makeAnswerSlot({ isCorrect: true }), makeAnswerSlot()]);
    setError(null);
    setSuccess(false);
  }, [removeQuestionImage]);

  const handleSubmit = useCallback(() => {
    setError(null);
    setSuccess(false);

    if (!questionText.trim()) {
      setError(t("quizUploadErrorNoQuestion"));
      return;
    }

    if (answers.some((a) => !a.text.trim())) {
      setError(t("quizUploadErrorEmptyAnswer"));
      return;
    }

    const formData = new FormData();
    formData.set("text", questionText.trim());
    formData.set("answerCount", String(answers.length));

    if (questionImage) {
      formData.set("image", questionImage);
    }

    for (const [i, answer] of answers.entries()) {
      formData.set(`answer-${i}-text`, answer.text.trim());
      formData.set(`answer-${i}-correct`, String(answer.isCorrect));
      if (answer.image) {
        formData.set(`answer-${i}-image`, answer.image);
      }
    }

    startTransition(async () => {
      const result = await createQuestionAction(formData);
      if (result.success) {
        setSuccess(true);
        // Reset form for next question after a brief moment
        setTimeout(() => {
          resetForm();
        }, 2000);
      } else {
        setError(result.error);
      }
    });
  }, [questionText, answers, questionImage, t, resetForm]);

  return (
    <div className="space-y-6">
      {/* Question text */}
      <div className="space-y-2">
        <Label htmlFor="question-text">{t("quizUploadQuestion")}</Label>
        <textarea
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          id="question-text"
          maxLength={500}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={t("quizUploadQuestionPlaceholder")}
          rows={3}
          value={questionText}
        />
      </div>

      {/* Question image (optional) */}
      <div className="space-y-2">
        <Label>{t("quizUploadImage")}</Label>
        {questionImagePreview ? (
          <div className="group relative w-fit">
            <Image
              alt="Question image"
              className="rounded-lg"
              height={200}
              src={questionImagePreview}
              width={300}
            />
            <button
              className="absolute top-2 right-2 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={removeQuestionImage}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-border border-dashed text-muted-foreground transition-colors hover:border-primary/50"
            disabled={isPending}
            onClick={() => questionImageRef.current?.click()}
            type="button"
          >
            <ImagePlus className="size-5" />
            <span className="text-sm">{t("quizUploadAddImage")}</span>
          </button>
        )}
        <input
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleQuestionImage}
          ref={questionImageRef}
          type="file"
        />
      </div>

      {/* Answers */}
      <div className="space-y-3">
        <Label>{t("quizUploadAnswers")}</Label>
        {answers.map((answer, index) => (
          <AnswerRow
            answer={answer}
            canRemove={answers.length > 2}
            disabled={isPending}
            index={index}
            key={answer.id}
            onImageChange={(e) => handleAnswerImage(index, e)}
            onRemove={() => removeAnswer(index)}
            onRemoveImage={() => removeAnswerImage(index)}
            onSetCorrect={() => setCorrectAnswer(index)}
            onTextChange={(text) => updateAnswer(index, { text })}
          />
        ))}

        {answers.length < 4 && (
          <Button
            className="w-full"
            disabled={isPending}
            onClick={addAnswer}
            size="sm"
            variant="outline"
          >
            <Plus className="mr-1 size-4" />
            {t("quizUploadAddAnswer")}
          </Button>
        )}
      </div>

      {/* Status messages */}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && (
        <p className="text-green-600 text-sm dark:text-green-400">
          {t("quizUploadSuccess")}
        </p>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        disabled={isPending}
        onClick={handleSubmit}
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("quizUploadSubmitting")}
          </>
        ) : (
          t("quizUploadSubmit")
        )}
      </Button>
    </div>
  );
}

function AnswerRow({
  answer,
  index,
  disabled,
  canRemove,
  onTextChange,
  onSetCorrect,
  onRemove,
  onImageChange,
  onRemoveImage,
}: {
  answer: AnswerSlot;
  index: number;
  disabled: boolean;
  canRemove: boolean;
  onTextChange: (text: string) => void;
  onSetCorrect: () => void;
  onRemove: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Games");

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        {/* Correct radio */}
        <button
          className={cn(
            "mt-2 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            answer.isCorrect
              ? "border-green-500 bg-green-500 text-white"
              : "border-border hover:border-green-500/50"
          )}
          disabled={disabled}
          onClick={onSetCorrect}
          title={t("quizUploadMarkCorrect")}
          type="button"
        >
          {answer.isCorrect && <Check className="size-3.5" />}
        </button>

        <div className="flex flex-1 flex-col gap-2">
          <Input
            disabled={disabled}
            maxLength={200}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t("quizUploadAnswerPlaceholder", {
              number: index + 1,
            })}
            value={answer.text}
          />

          {/* Answer image */}
          {answer.imagePreview ? (
            <div className="group relative w-fit">
              <Image
                alt={`Answer ${index + 1} image`}
                className="rounded"
                height={80}
                src={answer.imagePreview}
                width={120}
              />
              <button
                className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={onRemoveImage}
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              className="flex h-10 items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <ImagePlus className="size-3.5" />
              {t("quizUploadAddImage")}
            </button>
          )}
          <input
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={onImageChange}
            ref={inputRef}
            type="file"
          />
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            className="mt-2 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
