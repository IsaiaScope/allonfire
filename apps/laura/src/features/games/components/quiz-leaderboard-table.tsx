"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@allonfire/ui/components/avatar";
import { cn } from "@allonfire/ui/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  getInitials,
  RankBadge,
} from "@/features/games/components/leaderboard-shared";
import { formatTime } from "@/features/games/utils/format-time";
import { leaderboardRow, staggerContainer } from "@/lib/animation-variants";

type LeaderboardEntry = {
  id: string;
  userId: string;
  timeMs: number | null;
  score: number | null;
  createdAt: string;
  user: { name: string | null; image: string | null };
};

type QuizLeaderboardTableProps = {
  scores: LeaderboardEntry[];
  currentUserId: string;
};

export function QuizLeaderboardTable({
  scores,
  currentUserId,
}: QuizLeaderboardTableProps) {
  const t = useTranslations("Games");

  if (scores.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-muted-foreground">
        {t("noScoresLine1")}
        <br />
        {t("noScoresLine2")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-3 font-medium">{t("rank")}</th>
            <th className="px-2 py-3 font-medium">{t("player")}</th>
            <th className="px-2 py-3 text-right font-medium">
              {t("quizScore")}
            </th>
            <th className="px-2 py-3 text-right font-medium">{t("time")}</th>
            <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">
              {t("date")}
            </th>
          </tr>
        </thead>
        <motion.tbody
          animate="visible"
          initial="hidden"
          variants={staggerContainer}
        >
          {scores.map((entry, index) => (
            <motion.tr
              className={cn(
                "border-b transition-colors",
                entry.userId === currentUserId && "bg-primary/5"
              )}
              key={entry.id}
              variants={leaderboardRow}
            >
              <td className="px-2 py-3">
                <RankBadge rank={index + 1} />
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="hidden size-6 sm:flex">
                    <AvatarImage src={entry.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(entry.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "max-w-[100px] truncate sm:max-w-[200px]",
                      entry.userId === currentUserId && "font-medium"
                    )}
                  >
                    {entry.user.name ?? "Anonymous"}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3 text-right font-mono font-semibold">
                {entry.score ?? 0}/10
              </td>
              <td className="px-2 py-3 text-right font-mono">
                {entry.timeMs ? formatTime(entry.timeMs) : "—"}
              </td>
              <td className="hidden px-2 py-3 text-right text-muted-foreground sm:table-cell">
                {new Date(entry.createdAt).toLocaleDateString()}
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}
