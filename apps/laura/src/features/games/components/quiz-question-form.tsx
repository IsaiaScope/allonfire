"use client";

import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent } from "@allonfire/ui/components/card";
import { Label } from "@allonfire/ui/components/label";
import { cn } from "@allonfire/ui/lib/utils";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { QuizQuestionDetail } from "@/features/games/actions/quiz";
import {
  createQuestionAction,
  updateQuestionAction,
} from "@/features/games/actions/quiz";
import { Link } from "@/i18n/navigation";
import { convertHeicToJpeg } from "@/lib/convert-heic";
import { ACCEPTED_INPUT_STRING } from "@/lib/file-validation";

type AnswerSlot = {
  id: string;
  text: string;
  isCorrect: boolean;
  image: File | null;
  imagePreview: string | null;
  existingImageUrl: string | null;
  existingThumbUrl: string | null;
};

function makeAnswerSlot(overrides?: Partial<AnswerSlot>): AnswerSlot {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
    text: "",
    isCorrect: false,
    image: null,
    imagePreview: null,
    existingImageUrl: null,
    existingThumbUrl: null,
    ...overrides,
  };
}

function serializeAnswerToFormData(
  formData: FormData,
  index: number,
  answer: AnswerSlot,
  includeExisting: boolean
) {
  formData.set(`answer-${index}-text`, answer.text.trim());
  formData.set(`answer-${index}-correct`, String(answer.isCorrect));
  if (answer.image) {
    formData.set(`answer-${index}-image`, answer.image);
  }
  if (includeExisting) {
    formData.set(
      `answer-${index}-keepExistingImage`,
      String(!!answer.existingImageUrl)
    );
    if (answer.existingImageUrl) {
      formData.set(`answer-${index}-existingImageUrl`, answer.existingImageUrl);
    }
    if (answer.existingThumbUrl) {
      formData.set(`answer-${index}-existingThumbUrl`, answer.existingThumbUrl);
    }
  }
}

type QuizQuestionFormProps = {
  initialData?: QuizQuestionDetail;
};

export function QuizQuestionForm({ initialData }: QuizQuestionFormProps) {
  const t = useTranslations("Games");
  const router = useRouter();
  const isEditMode = !!initialData;
  const [isPending, startTransition] = useTransition();

  const [questionText, setQuestionText] = useState(initialData?.text ?? "");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<
    string | null
  >(null);
  const [existingQuestionImageUrl, setExistingQuestionImageUrl] = useState<
    string | null
  >(initialData?.imageUrl ?? null);
  const existingQuestionThumbUrl = initialData?.imageThumbnailUrl ?? null;
  const [answers, setAnswers] = useState<AnswerSlot[]>(() => {
    if (initialData?.answers.length) {
      return initialData.answers.map((a) =>
        makeAnswerSlot({
          text: a.text,
          isCorrect: a.isCorrect,
          existingImageUrl: a.imageUrl,
          existingThumbUrl: a.imageThumbnailUrl,
        })
      );
    }
    return [makeAnswerSlot({ isCorrect: true }), makeAnswerSlot()];
  });
  const [error, setError] = useState<string | null>(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [processingImage, setProcessingImage] = useState<string | null>(null);

  useEffect(() => {
    if (!showQuestionPreview) {
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQuestionPreview(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [showQuestionPreview]);

  const previewUrlsRef = useRef<Set<string>>(new Set());

  // Revoke all remaining object URLs on unmount
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const questionImageRef = useRef<HTMLInputElement>(null);

  const handleQuestionImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setProcessingImage("question");
        try {
          const converted = await convertHeicToJpeg(file);
          setQuestionImage(converted);
          const url = URL.createObjectURL(converted);
          previewUrlsRef.current.add(url);
          setQuestionImagePreview(url);
          setExistingQuestionImageUrl(null);
        } finally {
          setProcessingImage(null);
        }
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
    setExistingQuestionImageUrl(null);
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
        if (!next.some((a) => a.isCorrect) && next[0]) {
          next[0] = { ...next[0], isCorrect: true };
        }
        return next;
      });
    },
    [answers.length]
  );

  const handleAnswerImage = useCallback(
    async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setProcessingImage(`answer-${index}`);
        try {
          const converted = await convertHeicToJpeg(file);
          const url = URL.createObjectURL(converted);
          previewUrlsRef.current.add(url);
          updateAnswer(index, {
            image: converted,
            imagePreview: url,
            existingImageUrl: null,
            existingThumbUrl: null,
          });
        } finally {
          setProcessingImage(null);
        }
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
      updateAnswer(index, {
        image: null,
        imagePreview: null,
        existingImageUrl: null,
        existingThumbUrl: null,
      });
    },
    [answers, updateAnswer]
  );

  const buildFormData = useCallback(() => {
    const formData = new FormData();
    formData.set("text", questionText.trim());
    formData.set("answerCount", String(answers.length));

    if (questionImage) {
      formData.set("image", questionImage);
    }

    if (isEditMode) {
      formData.set("keepExistingImage", String(!!existingQuestionImageUrl));
      if (existingQuestionImageUrl) {
        formData.set("existingImageUrl", existingQuestionImageUrl);
      }
      if (existingQuestionThumbUrl) {
        formData.set("existingThumbUrl", existingQuestionThumbUrl);
      }
    }

    for (const [i, answer] of answers.entries()) {
      serializeAnswerToFormData(formData, i, answer, isEditMode);
    }

    return formData;
  }, [
    questionText,
    answers,
    questionImage,
    existingQuestionImageUrl,
    existingQuestionThumbUrl,
    isEditMode,
  ]);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!questionText.trim()) {
      setError(t("quizUploadErrorNoQuestion"));
      return;
    }

    if (answers.some((a) => !a.text.trim())) {
      setError(t("quizUploadErrorEmptyAnswer"));
      return;
    }

    const formData = buildFormData();

    startTransition(async () => {
      const action =
        isEditMode && initialData
          ? updateQuestionAction(initialData.id, formData)
          : createQuestionAction(formData);

      const result = await action;
      if (result.success) {
        toast.success(
          isEditMode ? t("quizUpdateSuccess") : t("quizCreateSuccess")
        );
        router.push("/games/quiz/edit");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }, [
    questionText,
    answers,
    buildFormData,
    isEditMode,
    initialData,
    t,
    router,
  ]);

  const displayedImageSrc = questionImagePreview ?? existingQuestionImageUrl;
  const submitLabel = isEditMode
    ? t("quizEditUpdateSubmit")
    : t("quizUploadSubmit");
  const submittingLabel = isEditMode
    ? t("quizEditUpdateSubmitting")
    : t("quizUploadSubmitting");

  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost">
        <Link href="/games/quiz/edit">
          <ArrowLeft className="mr-1 size-4" />
          {t("quizEditBackToList")}
        </Link>
      </Button>

      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-2 p-2">
          <Label className="text-base" htmlFor="question-text">
            {t("quizUploadQuestion")}
          </Label>
          <textarea
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            id="question-text"
            maxLength={500}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={t("quizUploadQuestionPlaceholder")}
            rows={3}
            value={questionText}
          />

          <Label className="text-base">{t("quizUploadImage")}</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative pt-1 pr-1">
              {displayedImageSrc && (
                <div className="relative max-w-40">
                  <button
                    className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg border bg-transparent p-0"
                    onClick={() => setShowQuestionPreview(true)}
                    type="button"
                  >
                    <Image
                      alt="Question image"
                      className="object-contain"
                      fill
                      sizes="160px"
                      src={displayedImageSrc}
                    />
                  </button>
                  <button
                    className="absolute -top-2 -right-2 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80"
                    onClick={removeQuestionImage}
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
              {!displayedImageSrc && processingImage === "question" && (
                <div className="flex aspect-square max-w-40 items-center justify-center rounded-lg border">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!displayedImageSrc && processingImage !== "question" && (
                <Button
                  className="w-1/2 items-center px-3 sm:h-9"
                  disabled={isPending || processingImage !== null}
                  onClick={() => questionImageRef.current?.click()}
                  size="sm"
                  variant="outline"
                >
                  <ImagePlus className="mr-1 size-4" />
                  <span className="text-xs sm:text-sm">
                    {t("quizUploadAddImage")}
                  </span>
                </Button>
              )}
              <input
                accept={ACCEPTED_INPUT_STRING}
                aria-hidden="true"
                className="hidden"
                id="question-image"
                name="question-image"
                onChange={handleQuestionImage}
                ref={questionImageRef}
                tabIndex={-1}
                type="file"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {showQuestionPreview &&
        displayedImageSrc &&
        createPortal(
          // biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click-to-close
          // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-2"
            onClick={() => setShowQuestionPreview(false)}
            role="dialog"
          >
            <div className="relative max-h-[90vh] max-w-[94vw] overflow-hidden rounded-lg">
              {/* biome-ignore lint/performance/noImgElement: may be blob URL */}
              {/* biome-ignore lint/correctness/useImageSize: CSS controls dimensions */}
              <img
                alt="Question preview"
                className="max-h-[90vh] max-w-[94vw] object-contain"
                src={displayedImageSrc}
              />
            </div>
          </div>,
          document.body
        )}

      <div className="space-y-3">
        <p className="font-medium text-base leading-none">
          {t("quizUploadAnswers")}
        </p>
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
            processingImage={processingImage}
          />
        ))}

        {answers.length < 4 && (
          <Button
            className="w-full"
            disabled={isPending}
            onClick={addAnswer}
            size="default"
            variant="outline"
          >
            <Plus className="mr-1 size-4" />
            {t("quizUploadAddAnswer")}
          </Button>
        )}
      </div>

      {error && <p className="text-base text-destructive">{error}</p>}

      <Button
        className="w-full"
        disabled={isPending}
        onClick={handleSubmit}
        size="lg"
      >
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isPending ? submittingLabel : submitLabel}
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
  processingImage,
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
  processingImage: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Games");
  const [showPreview, setShowPreview] = useState(false);

  const displayedImageSrc = answer.imagePreview ?? answer.existingImageUrl;

  useEffect(() => {
    if (!showPreview) {
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPreview(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [showPreview]);

  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-2 p-2">
          <textarea
            aria-label={t("quizUploadAnswerPlaceholder", {
              number: index + 1,
            })}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            id={`answer-text-${index}`}
            maxLength={200}
            name={`answer-text-${index}`}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t("quizUploadAnswerPlaceholder", {
              number: index + 1,
            })}
            rows={2}
            value={answer.text}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative pt-1 pr-1">
              {displayedImageSrc && (
                <div className="relative max-w-40">
                  <button
                    className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg border bg-transparent p-0"
                    onClick={() => setShowPreview(true)}
                    type="button"
                  >
                    <Image
                      alt={`Answer ${index + 1} image`}
                      className="object-contain"
                      fill
                      sizes="160px"
                      src={displayedImageSrc}
                    />
                  </button>
                  <button
                    className="absolute -top-2 -right-2 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80"
                    onClick={onRemoveImage}
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
              {!displayedImageSrc && processingImage === `answer-${index}` && (
                <div className="flex aspect-square max-w-40 items-center justify-center rounded-lg border">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!displayedImageSrc && processingImage !== `answer-${index}` && (
                <Button
                  className="w-1/2 items-center px-3 sm:h-9"
                  disabled={disabled || processingImage !== null}
                  onClick={() => inputRef.current?.click()}
                  size="sm"
                  variant="outline"
                >
                  <ImagePlus className="mr-1 size-4" />
                  <span className="text-xs sm:text-sm">
                    {t("quizUploadAddImage")}
                  </span>
                </Button>
              )}
              <input
                accept={ACCEPTED_INPUT_STRING}
                aria-hidden="true"
                className="hidden"
                id={`answer-image-${index}`}
                name={`answer-image-${index}`}
                onChange={onImageChange}
                ref={inputRef}
                tabIndex={-1}
                type="file"
              />
            </div>

            <div className="flex flex-col items-end justify-end gap-2">
              <Button
                className={cn(
                  "w-1/2 items-center px-3 sm:h-9",
                  answer.isCorrect
                    ? "border-green-700 bg-green-700 text-white hover:bg-green-800"
                    : ""
                )}
                disabled={disabled}
                onClick={onSetCorrect}
                size="sm"
                variant={answer.isCorrect ? "default" : "outline"}
              >
                <Check className="mr-1 size-4" />
                <span className="text-xs sm:text-sm">
                  {t("quizEditCorrectAnswer")}
                </span>
              </Button>
              {canRemove && (
                <Button
                  className="w-1/2 items-center px-3 text-destructive sm:h-9"
                  disabled={disabled}
                  onClick={onRemove}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="mr-1 size-4" />
                  <span className="text-xs sm:text-sm">
                    {t("quizEditDeleteAnswer")}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showPreview &&
        displayedImageSrc &&
        createPortal(
          // biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click-to-close is standard for dialog overlays
          // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via useEffect listener
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-2"
            onClick={() => setShowPreview(false)}
            role="dialog"
          >
            <div className="relative max-h-[90vh] max-w-[94vw] overflow-hidden rounded-lg">
              {/* biome-ignore lint/performance/noImgElement: preview may be blob URL or remote URL */}
              {/* biome-ignore lint/correctness/useImageSize: CSS controls dimensions */}
              <img
                alt={`Answer ${index + 1} preview`}
                className="max-h-[90vh] max-w-[94vw] object-contain"
                src={displayedImageSrc}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
