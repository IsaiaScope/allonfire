"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@allonfire/ui/components/alert-dialog";
import { Button } from "@allonfire/ui/components/button";
import { Loader2, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/features/games/utils/format-time";

type GameCompleteDialogProps = {
  open: boolean;
  elapsedMs: number;
  moves: number;
  submitState: "idle" | "submitting" | "success" | "error" | "viewer-skipped";
  isNewBest: boolean;
  onPlayAgain: () => void;
  onRetrySubmit: () => void;
  onViewLeaderboard: () => void;
};

export function GameCompleteDialog({
  open,
  elapsedMs,
  moves,
  submitState,
  isNewBest,
  onPlayAgain,
  onRetrySubmit,
  onViewLeaderboard,
}: GameCompleteDialogProps) {
  const t = useTranslations("Games");

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="size-5 shrink-0 text-amber-400" />
            {t("gameComplete")}
            {isNewBest && (
              <span className="ml-auto shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 font-semibold text-amber-400 text-xs">
                {t("newRecord")}
              </span>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {t("memoryDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                {t("time")}
              </p>
              <p className="mt-1 font-bold font-mono text-2xl">
                {formatTime(elapsedMs)}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                {t("moves")}
              </p>
              <p className="mt-1 font-bold font-mono text-2xl">{moves}</p>
            </div>
          </div>

          {submitState === "submitting" && (
            <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("submitting")}
            </p>
          )}
          {submitState === "error" && (
            <div className="flex items-center justify-center gap-2">
              <p className="text-destructive text-sm">{t("submitError")}</p>
              <Button onClick={onRetrySubmit} size="sm" variant="outline">
                {t("retry")}
              </Button>
            </div>
          )}
          {submitState === "viewer-skipped" && (
            <p className="text-center text-muted-foreground text-sm">
              {t("viewerScoreNotice")}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={onViewLeaderboard}
              variant="outline"
            >
              {t("viewLeaderboard")}
            </Button>
            <Button className="flex-1" onClick={onPlayAgain}>
              {t("playAgain")}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
