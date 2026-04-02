import { Button } from "@allonfire/ui/components/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGlobalBestAction } from "@/features/games/actions/games";
import { getQuizQuestionsAction } from "@/features/games/actions/quiz";
import { QuizBoard } from "@/features/games/components/quiz-board";
import { getAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  const seo = await getTranslations({ locale, namespace: "SEO" });
  return {
    title: t("quizTitle"),
    description: seo("quizDescription"),
    alternates: getAlternates(locale, "/games/quiz"),
  };
}

export default async function QuizGamePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Games");
  const [result, globalBest] = await Promise.all([
    getQuizQuestionsAction(),
    getGlobalBestAction("QUIZ"),
  ]);

  if (!result.success) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          {t("quizNotEnoughLine1")}
          <br />
          {t("quizNotEnoughLine2", { count: result.questionCount })}
          <br />
          {t("quizNotEnoughLine3")}
        </p>
        <Button asChild>
          <Link href="/games">{t("backToGames")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col py-2">
      <QuizBoard globalBest={globalBest} initialQuestions={result.questions} />
    </div>
  );
}
