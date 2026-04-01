import { checkAppAccess } from "@allonfire/auth/guard";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getQuizQuestionByIdAction } from "@/features/games/actions/quiz";
import { QuizQuestionForm } from "@/features/games/components/quiz-question-form";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return {
    title: t("quizEditUpdateSubmit"),
    robots: { index: false, follow: false },
  };
}

export default async function QuizEditQuestionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await checkAppAccess(auth, "laura");

  if (user.role !== "ADMIN") {
    redirect("/games");
  }

  const question = await getQuizQuestionByIdAction(id);
  if (!question) {
    redirect("/games/quiz/edit");
  }

  const t = await getTranslations("Games");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">
          {t("quizEditUpdateSubmit")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("quizEditDescription")}
        </p>
      </div>

      <QuizQuestionForm initialData={question} />
    </div>
  );
}
