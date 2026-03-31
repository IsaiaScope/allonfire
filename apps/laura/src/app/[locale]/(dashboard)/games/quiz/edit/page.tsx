import { checkAppAccess } from "@allonfire/auth/guard";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getQuizQuestionsListAction } from "@/features/games/actions/quiz";
import { QuizQuestionList } from "@/features/games/components/quiz-question-list";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("quizEditTitle"), robots: { index: false, follow: false } };
}

export default async function QuizEditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await checkAppAccess(auth, "laura");

  if (user.role !== "ADMIN") {
    redirect("/games");
  }

  const t = await getTranslations("Games");
  const questions = await getQuizQuestionsListAction();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">
          {t("quizEditTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("quizEditDescription")}
        </p>
      </div>

      <QuizQuestionList questions={questions} />
    </div>
  );
}
