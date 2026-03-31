import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameHub } from "@/features/games/components/game-hub";
import { PageContainer } from "@/features/layout/components/page-container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("title") };
}

export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageContainer>
      <GameHub />
    </PageContainer>
  );
}
