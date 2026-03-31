import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent } from "@allonfire/ui/components/card";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getQuizLeaderboardAction } from "@/features/games/actions/quiz";
import { LeaderboardStats } from "@/features/games/components/leaderboard-stats";
import { QuizLeaderboardTable } from "@/features/games/components/quiz-leaderboard-table";
import { PageContainer } from "@/features/layout/components/page-container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Games" });
  return { title: t("quizLeaderboardTitle") };
}

export default async function QuizLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Games");
  const data = await getQuizLeaderboardAction();

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl tracking-tight">
              {t("quizTitle")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("leaderboardTitle")}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/games/quiz">
              <Gamepad2 className="mr-1 size-4" />
              {t("play")}
            </Link>
          </Button>
        </div>

        <Card className="gap-0 py-2">
          <CardContent className="px-0">
            <QuizLeaderboardTable
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
