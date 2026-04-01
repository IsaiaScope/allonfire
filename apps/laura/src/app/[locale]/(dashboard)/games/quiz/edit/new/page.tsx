import { checkAppAccess } from "@allonfire/auth/guard";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AnimatedPageWrapper,
  AnimatedSection,
} from "@/components/animated-page";
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
    title: t("quizUploadTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function QuizNewQuestionPage({
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

  return (
    <AnimatedPageWrapper className="mx-auto w-full max-w-2xl space-y-6">
      <AnimatedSection>
        <h1 className="font-bold text-2xl tracking-tight">
          {t("quizUploadTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("quizUploadDescription")}
        </p>
      </AnimatedSection>

      <QuizQuestionForm />
    </AnimatedPageWrapper>
  );
}
