import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent } from "@allonfire/ui/components/card";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLeaderboardAction } from "@/features/games/actions/games";
import { LeaderboardStats } from "@/features/games/components/leaderboard-stats";
import { LeaderboardTable } from "@/features/games/components/leaderboard-table";
import { PageContainer } from "@/features/layout/components/page-container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("leaderboardTitle") };
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
      <div className="space-y-6">
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

        <Card className="gap-0 py-2">
          <CardContent className="px-0">
            <LeaderboardTable
              currentUserId={data.currentUserId}
              scores={data.scores}
            />
          </CardContent>
        </Card>

        <LeaderboardStats
          avgTimeMs={data.stats.avgTimeMs}
          bestTimeMs={data.stats.bestTimeMs}
          totalGames={data.stats.totalGames}
          uniquePlayers={data.stats.uniquePlayers}
        />
      </div>
    </PageContainer>
  );
}
