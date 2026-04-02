import { Button } from "@allonfire/ui/components/button";
import { Upload } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getGlobalBestAction,
  getMemoryPhotosAction,
} from "@/features/games/actions/games";
import { MemoryBoard } from "@/features/games/components/memory-board";
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
    title: t("memoryTitle"),
    description: seo("memoryDescription"),
    alternates: getAlternates(locale, "/games/memory"),
  };
}

export default async function MemoryGamePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Games");
  const [result, globalBest] = await Promise.all([
    getMemoryPhotosAction(),
    getGlobalBestAction("MEMORY"),
  ]);

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
    <div className="flex flex-1 flex-col md:justify-center">
      <MemoryBoard globalBest={globalBest} initialCards={result.cards} />
    </div>
  );
}
