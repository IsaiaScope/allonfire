"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@allonfire/ui/components/alert-dialog";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Loader2, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type GameCompleteDialogProps = {
  open: boolean;
  elapsedMs: number;
  moves: number;
  submitState: "idle" | "submitting" | "success" | "error";
  isNewBest: boolean;
  onPlayAgain: () => void;
  onRetrySubmit: () => void;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

export function GameCompleteDialog({
  open,
  elapsedMs,
  moves,
  submitState,
  isNewBest,
  onPlayAgain,
  onRetrySubmit,
}: GameCompleteDialogProps) {
  const t = useTranslations("Games");

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-yellow-500" />
            {t("gameComplete")}
            {isNewBest && <Badge variant="secondary">{t("newRecord")}</Badge>}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("memoryDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-muted-foreground text-xs">{t("time")}</p>
              <p className="font-bold font-mono text-lg">
                {formatTime(elapsedMs)}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-muted-foreground text-xs">{t("moves")}</p>
              <p className="font-bold font-mono text-lg">{moves}</p>
            </div>
          </div>

          {submitState === "submitting" && (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("submitting")}
            </p>
          )}
          {submitState === "success" && (
            <p className="text-green-600 text-sm dark:text-green-400">
              {t("scoreSubmitted")}
            </p>
          )}
          {submitState === "error" && (
            <div className="flex items-center gap-2">
              <p className="text-destructive text-sm">{t("submitError")}</p>
              <Button onClick={onRetrySubmit} size="sm" variant="outline">
                {t("retry")}
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Link href="/games/leaderboard">{t("viewLeaderboard")}</Link>
          </AlertDialogCancel>
          <AlertDialogAction onClick={onPlayAgain}>
            {t("playAgain")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
