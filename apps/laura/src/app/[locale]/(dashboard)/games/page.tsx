import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameHub } from "@/features/games/components/game-hub";
import { PageContainer } from "@/features/layout/components/page-container";
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
    title: t("title"),
    description: seo("gamesHubDescription"),
    alternates: getAlternates(locale, "/games"),
  };
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
