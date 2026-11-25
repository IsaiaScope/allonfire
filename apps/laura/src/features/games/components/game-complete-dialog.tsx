"use client";

import { formatTime } from "@allonfire/core/shared/utils/format-time";
import { AOFFormAlert } from "@allonfire/ui/features/form/components/aof-form-alert";
import {
  AOFButton,
  aofButtonVariants,
} from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { AOF_ACTION } from "@allonfire/ui/shared/constants/action";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconClick,
  IconClock,
  IconLoader2,
  IconPlayerPlay,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Link } from "@/features/i18n/navigation";
import { ActionArt } from "@/shared/components/action-art";
import {
  ACTION_DRESSING,
  COMPACT_ACTION,
} from "@/shared/components/action-dressing";
import { OceanArt } from "@/shared/components/ocean-art";
import { OceanDialog } from "@/shared/components/ocean-dialog";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";
import type { SubmitView } from "../utils/submit-view";
import { BoardStat } from "./board-stat";
import { GameResult } from "./game-result";

export type GameCompleteDialogProps = {
  moves: number;
  onOpenChange: (open: boolean) => void;
  onPlayAgain: () => void;
  onRetry: () => void;
  open: boolean;
  submit: SubmitView;
  timeMs: number;
};

/**
 * The end of a game, dressed as the delete-photo alert. While the score is
 * being saved, Play again is the status: a spinner and "Saving the game",
 * busy and not clickable until it ends. The band's far end
 * holds Try again, a compact themed button like the board's New game
 * folded to its icon, and only when saving failed. Under it the time and the
 * moves as labelled badges, then what saving earned as badges in a grid
 * (`GameResult`), the way to the leaderboard, and, in one alert (never a
 * toast: nothing else is on screen), why a game was not saved: it failed, or
 * it could not have been played. The footer's Close and Play again are a
 * column on a phone and one line from `sm`, as the alert's buttons. Escape or
 * Close leaves the final numbers and the board's New game behind.
 */
export const GameCompleteDialog = ({
  moves,
  onOpenChange,
  onPlayAgain,
  onRetry,
  open,
  submit,
  timeMs,
}: GameCompleteDialogProps) => {
  const t = useTranslations("Games");
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const saving = submit.state === "submitting";
  let problem: string | null = null;
  if (submit.state === "failed") {
    problem = t("submitError");
  } else if (submit.state === "notRecorded") {
    problem = t("notRecorded");
  } else if (submit.state === "refused") {
    problem = t("refused");
  }
  return (
    <OceanDialog
      actions={
        <>
          <AOFButton
            className={ACTION_DRESSING.className}
            onClick={close}
            size="field"
            variant="outline"
          >
            <IconX aria-hidden />
            {t("close")}
            {ACTION_DRESSING.marks[AOF_ACTION.BACK]}
          </AOFButton>
          <AOFButton
            aria-busy={saving || undefined}
            className={ACTION_DRESSING.className}
            disabled={saving}
            onClick={onPlayAgain}
            size="field"
          >
            {saving ? (
              <IconLoader2 aria-hidden className="motion-safe:animate-spin" />
            ) : (
              <IconPlayerPlay aria-hidden />
            )}
            {saving ? t("submitting") : t("playAgain")}
            {ACTION_DRESSING.marks[AOF_ACTION.ENTER]}
          </AOFButton>
        </>
      }
      end={
        submit.state === "failed" ? (
          <AOFTooltip contentProps={{ side: "left" }} label={t("retry")}>
            <AOFButton
              aria-label={t("retry")}
              className={cn(COMPACT_ACTION.className, "w-8 px-0")}
              onClick={onRetry}
              size="sm"
            >
              <IconRefresh aria-hidden />
              <ActionArt
                art={MASCOT.ACTION[AOF_ACTION.RETRY]}
                className="right-1/2 size-7 translate-x-1/2"
              />
            </AOFButton>
          </AOFTooltip>
        ) : null
      }
      onOpenChange={onOpenChange}
      open={open}
      title={t("gameComplete")}
    >
      <dl className="grid grid-cols-2 gap-2">
        <BoardStat
          className="h-auto min-h-10 w-full py-1 text-base"
          icon={<IconClock aria-hidden />}
          label={t("time")}
          labelled
          tone="success"
        >
          {formatTime(timeMs)}
        </BoardStat>
        <BoardStat
          className="h-auto min-h-10 w-full py-1 text-base"
          icon={<IconClick aria-hidden />}
          label={t("moves")}
          labelled
          tone="primary"
        >
          {moves}
        </BoardStat>
      </dl>
      <div className="flex flex-col">
        <GameResult submit={submit} />
        <AOFFormAlert className="min-h-0 [&_p]:mt-2">{problem}</AOFFormAlert>
      </div>
      <Link
        className={cn(
          aofButtonVariants({ size: "sm", variant: "link" }),
          "justify-self-start px-2 font-bold underline"
        )}
        href={LAURA.PAGE.LEADERBOARD}
      >
        <OceanArt art={MASCOT.GAMES.BADGE_RECORD} className="size-4" />
        {t("viewLeaderboard")}
      </Link>
    </OceanDialog>
  );
};
