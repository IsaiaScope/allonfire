import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Clock, Gamepad2, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/features/games/utils/format-time";

type LeaderboardStatsProps = {
  totalGames: number;
  uniquePlayers: number;
  avgTimeMs: number | null;
  bestTimeMs: number | null;
  userTotalGames: number;
  userBestTimeMs: number | null;
};

export function LeaderboardStats({
  totalGames,
  uniquePlayers,
  avgTimeMs,
  bestTimeMs,
  userTotalGames,
  userBestTimeMs,
}: LeaderboardStatsProps) {
  const t = useTranslations("Games");

  const stats = [
    { icon: Gamepad2, label: t("totalGames"), value: totalGames },
    { icon: Users, label: t("uniquePlayers"), value: uniquePlayers },
    {
      icon: Trophy,
      label: t("bestTime"),
      value: bestTimeMs ? formatTime(bestTimeMs) : "—",
    },
    {
      icon: Clock,
      label: t("avgTime"),
      value: avgTimeMs ? formatTime(Math.round(avgTimeMs)) : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center p-3">
              <stat.icon className="mb-1 size-4 text-muted-foreground" />
              <p className="font-bold font-mono text-lg">{stat.value}</p>
              <p className="text-muted-foreground text-xs">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {userTotalGames > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("yourStats")}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">{t("gamesPlayed")}:</span>{" "}
              <span className="font-medium font-mono">{userTotalGames}</span>
            </div>
            {userBestTimeMs && (
              <div>
                <span className="text-muted-foreground">
                  {t("yourBestTime")}:
                </span>{" "}
                <span className="font-medium font-mono">
                  {formatTime(userBestTimeMs)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
