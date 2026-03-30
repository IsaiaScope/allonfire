import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@allonfire/ui/components/avatar";
import { Badge } from "@allonfire/ui/components/badge";
import { cn } from "@allonfire/ui/lib/utils";
import { useTranslations } from "next-intl";

type LeaderboardEntry = {
  id: string;
  userId: string;
  timeMs: number | null;
  score: number | null;
  createdAt: string;
  user: { name: string | null; image: string | null };
};

type LeaderboardTableProps = {
  scores: LeaderboardEntry[];
  currentUserId: string;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

function getInitials(name: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return "?";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Badge className="bg-yellow-500 text-white">1st</Badge>;
  }
  if (rank === 2) {
    return <Badge className="bg-gray-400 text-white">2nd</Badge>;
  }
  if (rank === 3) {
    return <Badge className="bg-amber-700 text-white">3rd</Badge>;
  }
  return <span className="text-muted-foreground text-sm">{rank}</span>;
}

export function LeaderboardTable({
  scores,
  currentUserId,
}: LeaderboardTableProps) {
  const t = useTranslations("Games");

  if (scores.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">{t("noScores")}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-3 font-medium">{t("rank")}</th>
            <th className="px-2 py-3 font-medium">{t("player")}</th>
            <th className="px-2 py-3 text-right font-medium">{t("time")}</th>
            <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">
              {t("moves")}
            </th>
            <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">
              {t("date")}
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, index) => (
            <tr
              className={cn(
                "border-b transition-colors",
                entry.userId === currentUserId && "bg-primary/5"
              )}
              key={entry.id}
            >
              <td className="px-2 py-3">
                <RankBadge rank={index + 1} />
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={entry.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(entry.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      entry.userId === currentUserId && "font-medium"
                    )}
                  >
                    {entry.user.name ?? "Anonymous"}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3 text-right font-mono">
                {entry.timeMs ? formatTime(entry.timeMs) : "—"}
              </td>
              <td className="hidden px-2 py-3 text-right font-mono sm:table-cell">
                {entry.score ?? "—"}
              </td>
              <td className="hidden px-2 py-3 text-right text-muted-foreground sm:table-cell">
                {new Date(entry.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
