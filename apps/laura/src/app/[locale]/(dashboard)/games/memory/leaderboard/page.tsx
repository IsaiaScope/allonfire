import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent } from "@allonfire/ui/components/card";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AnimatedPageWrapper,
  AnimatedSection,
} from "@/components/animated-page";
import { getLeaderboardAction } from "@/features/games/actions/games";
import { LeaderboardStats } from "@/features/games/components/leaderboard-stats";
import { LeaderboardTable } from "@/features/games/components/leaderboard-table";
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
    title: t("leaderboardTitle"),
    description: seo("memoryLeaderboardDescription"),
    alternates: getAlternates(locale, "/games/memory/leaderboard"),
  };
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Games");
  const data = await getLeaderboardAction("MEMORY");

  return (
    <PageContainer>
      <AnimatedPageWrapper>
        <AnimatedSection>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-2xl tracking-tight">
                {t("memoryTitle")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("leaderboardTitle")}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/games/memory">
                <Gamepad2 className="mr-1 size-4" />
                {t("play")}
              </Link>
            </Button>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <Card className="gap-0 py-2">
            <CardContent className="px-0">
              <LeaderboardTable
                currentUserId={data.currentUserId}
                scores={data.scores}
              />
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection>
          <LeaderboardStats
            avgTimeMs={data.stats.avgTimeMs}
            bestTimeMs={data.stats.bestTimeMs}
            totalGames={data.stats.totalGames}
            uniquePlayers={data.stats.uniquePlayers}
            userStats={data.userStats}
          />
        </AnimatedSection>
      </AnimatedPageWrapper>
    </PageContainer>
  );
}
