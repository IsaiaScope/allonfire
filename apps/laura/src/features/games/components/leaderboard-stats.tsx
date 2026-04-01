"use client";

import { Card, CardContent } from "@allonfire/ui/components/card";
import { motion } from "framer-motion";
import { Clock, Gamepad2, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/features/games/utils/format-time";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";

type LeaderboardStatsProps = {
  totalGames: number;
  uniquePlayers: number;
  avgTimeMs: number | null;
  bestTimeMs: number | null;
};

export function LeaderboardStats({
  totalGames,
  uniquePlayers,
  avgTimeMs,
  bestTimeMs,
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
    <motion.div
      animate="visible"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      initial="hidden"
      variants={staggerContainer}
    >
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={fadeInUp}>
          <Card>
            <CardContent className="flex flex-col items-center p-3">
              <stat.icon className="mb-1 size-6 text-muted-foreground" />
              <p className="font-bold font-mono text-lg">{stat.value}</p>
              <p className="text-muted-foreground text-xs">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
