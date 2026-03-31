"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@allonfire/ui/components/alert-dialog";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Input } from "@allonfire/ui/components/input";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { QuizQuestionListItem } from "@/features/games/actions/quiz";
import { deleteQuestionAction } from "@/features/games/actions/quiz";
import { Link } from "@/i18n/navigation";

type QuizQuestionListProps = {
  questions: QuizQuestionListItem[];
};

export function QuizQuestionList({ questions }: QuizQuestionListProps) {
  const t = useTranslations("Games");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return questions;
    }
    const term = search.toLowerCase();
    return questions.filter((q) => q.text.toLowerCase().includes(term));
  }, [questions, search]);

  function handleDelete() {
    if (!deleteId) {
      return;
    }
    startTransition(async () => {
      const result = await deleteQuestionAction(deleteId);
      if (result.success) {
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(t("quizDeleteError"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("quizEditSearch")}
            className="pl-9 text-base"
            id="quiz-search"
            name="quiz-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("quizEditSearch")}
            value={search}
          />
        </div>
        <Button asChild className="sm:size-auto sm:px-4 sm:py-2" size="icon">
          <Link href="/games/quiz/edit/new">
            <Plus className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("quizEditNewQuestion")}</span>
          </Link>
        </Button>
      </div>

      {questions.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-medium text-muted-foreground">
            {t("quizEditEmpty")}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {t("quizEditEmptyDescription")}
          </p>
        </div>
      )}

      {questions.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t("quizEditNoResults")}</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="divide-y rounded-lg border">
          {filtered.map((question) => (
            <div
              className="flex items-center gap-3 px-4 py-3"
              key={question.id}
            >
              {question.imageThumbnailUrl && (
                <div className="relative size-12 shrink-0 overflow-hidden rounded">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="48px"
                    src={question.imageThumbnailUrl}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium text-base">
                  {question.text}
                </p>
                <Badge
                  className="mt-1 hidden sm:inline-flex"
                  variant="secondary"
                >
                  {t("quizEditAnswerCount", { count: question.answerCount })}
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  asChild
                  className="size-8 sm:size-auto sm:h-8 sm:px-3"
                  size="icon"
                  variant="ghost"
                >
                  <Link href={`/games/quiz/edit/${question.id}`}>
                    <Pencil className="size-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">
                      {t("quizEditEditButton")}
                    </span>
                  </Link>
                </Button>
                <Button
                  className="size-8"
                  onClick={() => setDeleteId(question.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        onOpenChange={(open) => !(open || isPending) && setDeleteId(null)}
        open={!!deleteId}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("quizEditDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("quizEditDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("quizEditDeleteCancel")}
            </AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleDelete}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" />
                  {t("quizEditDeleting")}
                </>
              ) : (
                t("quizEditDeleteConfirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
