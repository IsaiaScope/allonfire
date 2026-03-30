import { checkAppAccess } from "@allonfire/auth/guard";
import { Button } from "@allonfire/ui/components/button";
import { Upload } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMemoryPhotosAction } from "@/features/games/actions/games";
import { MemoryBoard } from "@/features/games/components/memory-board";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("memoryTitle") };
}

export default async function MemoryGamePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await checkAppAccess(auth, "laura");

  const t = await getTranslations("Games");
  const result = await getMemoryPhotosAction();

  if (!result.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("notEnoughPhotos")}</p>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 size-4" />
            {t("goToUpload")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-bold text-2xl tracking-tight">
          {t("memoryTitle")}
        </h1>
      </div>
      <MemoryBoard initialCards={result.cards} />
    </div>
  );
}
