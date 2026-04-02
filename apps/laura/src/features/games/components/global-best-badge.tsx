import type { LucideIcon } from "lucide-react";
import { Clock, Trophy } from "lucide-react";
import type { GlobalBest } from "@/features/games/actions/games";
import { formatTime } from "@/features/games/utils/format-time";

type GlobalBestBadgeProps = {
  globalBest: GlobalBest | null;
  scoreIcon: LucideIcon;
};

export function GlobalBestBadge({
  globalBest,
  scoreIcon: ScoreIcon,
}: GlobalBestBadgeProps) {
  if (!globalBest) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono font-semibold text-amber-400 text-xs tabular-nums">
      <Trophy className="size-3.5 shrink-0" />
      {formatTime(globalBest.timeMs)}
      <Clock className="size-3 shrink-0" />- {globalBest.score}
      <ScoreIcon className="size-3 shrink-0" />
    </span>
  );
}
