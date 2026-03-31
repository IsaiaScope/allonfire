import { checkAppAccess } from "@allonfire/auth/guard";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuizUploadForm } from "@/features/games/components/quiz-upload-form";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("quizUploadTitle") };
}

export default async function QuizUploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await checkAppAccess(auth, "laura");

  // Viewers cannot create questions
  if (user.role === "VIEWER") {
    redirect("/games");
  }

  const t = await getTranslations("Games");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">
          {t("quizUploadTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("quizUploadDescription")}
        </p>
      </div>

      <QuizUploadForm />
    </div>
  );
}
