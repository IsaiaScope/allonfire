"use client";

import { Card, CardContent } from "@allonfire/ui/components/card";
import { cn } from "@allonfire/ui/lib/utils";
import { motion } from "framer-motion";
import { Clock, Gamepad2, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/features/games/utils/format-time";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";

type StatItem = {
  icon: typeof Gamepad2;
  label: string;
  value: string | number;
};

function StatsRow({
  title,
  stats,
  accent,
}: {
  title: string;
  stats: StatItem[];
  accent?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        {title}
      </p>
      <motion.div
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        initial="hidden"
        variants={staggerContainer}
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeInUp}>
            <Card className={cn(accent && "border-primary/20 bg-primary/5")}>
              <CardContent className="flex flex-col items-center p-3">
                <stat.icon className="mb-1 size-5 text-muted-foreground" />
                <p className="font-bold font-mono text-base">{stat.value}</p>
                <p className="text-muted-foreground text-xs">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

type LeaderboardStatsProps = {
  totalGames: number;
  uniquePlayers: number;
  avgTimeMs: number | null;
  bestTimeMs: number | null;
  userStats: {
    totalGames: number;
    bestTimeMs: number | null;
    bestScore: number | null;
  };
};

export function LeaderboardStats({
  totalGames,
  uniquePlayers,
  avgTimeMs,
  bestTimeMs,
  userStats,
}: LeaderboardStatsProps) {
  const t = useTranslations("Games");

  const userStatItems: StatItem[] = [
    { icon: Gamepad2, label: t("gamesPlayed"), value: userStats.totalGames },
    {
      icon: Clock,
      label: t("yourBestTime"),
      value: userStats.bestTimeMs ? formatTime(userStats.bestTimeMs) : "—",
    },
    {
      icon: Trophy,
      label: t("yourBestScore"),
      value: userStats.bestScore ?? "—",
    },
  ];

  const globalStatItems: StatItem[] = [
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
      <StatsRow accent stats={userStatItems} title={t("yourStats")} />
      <StatsRow stats={globalStatItems} title={t("globalStats")} />
    </div>
  );
}
