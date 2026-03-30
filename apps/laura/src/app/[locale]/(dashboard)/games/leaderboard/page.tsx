import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLeaderboardAction } from "@/features/games/actions/games";
import { LeaderboardStats } from "@/features/games/components/leaderboard-stats";
import { LeaderboardTable } from "@/features/games/components/leaderboard-table";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            {t("leaderboardTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("leaderboardDescription")}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/games/memory">
            <Gamepad2 className="mr-1 size-4" />
            {t("play")}
          </Link>
        </Button>
      </div>

      <LeaderboardStats
        avgTimeMs={data.stats.avgTimeMs}
        bestTimeMs={data.stats.bestTimeMs}
        totalGames={data.stats.totalGames}
        uniquePlayers={data.stats.uniquePlayers}
        userBestTimeMs={data.userBestTimeMs}
        userTotalGames={data.userStats.totalGames}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("memoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardTable
            currentUserId={data.currentUserId}
            scores={data.scores}
          />
        </CardContent>
      </Card>
    </div>
  );
}
