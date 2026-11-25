"use client";

import {
  AOFButton,
  aofButtonVariants,
} from "@allonfire/ui/shared/components/aof-button";
import { IconRefresh, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { OceanNotice } from "@/features/errors/components/ocean-notice-frame";
import { Link } from "@/features/i18n/navigation";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";

export type GamesNoticeProps =
  | {
      /** An Admin is pointed to Upload; a User is told what will come. */
      canUpload: boolean;
      have: number;
      kind: "needMore";
      needed: number;
    }
  | { kind: "deckFailed"; onRetry: () => void }
  | { kind: "forbidden" }
  | { kind: "leaderboardFailed"; onRetry: () => void }
  | { kind: "noScores" };

/**
 * What stands where the cards or the table would, when there is nothing to
 * show: too few photos to deal, a read that failed (ask again; never a toast:
 * nothing else is on screen), Laura not open to the visitor, or no game played
 * yet. Drawn as the App's other notices are, each moment with its own picture.
 */
export const GamesNotice = (props: GamesNoticeProps) => {
  const t = useTranslations("Games");
  const retry = (onRetry: () => void) => (
    <AOFButton
      className={ACTION_DRESSING.className}
      onClick={onRetry}
      size="field"
    >
      {ACTION_DRESSING.marks.retry}
      <IconRefresh aria-hidden />
      {t("retry")}
    </AOFButton>
  );
  switch (props.kind) {
    case "deckFailed":
    case "leaderboardFailed":
      return (
        <OceanNotice
          action={retry(props.onRetry)}
          art={MASCOT.ERROR}
          description={t("deckFailedBody")}
          heading={
            props.kind === "deckFailed"
              ? t("deckFailed")
              : t("leaderboardFailed")
          }
          scope="part"
        />
      );
    case "forbidden":
      return (
        <OceanNotice
          art={MASCOT.NOT_FOUND}
          description={t("forbidden")}
          heading={t("title")}
          scope="part"
        />
      );
    case "noScores":
      return (
        <OceanNotice
          art={MASCOT.GAMES.NO_SCORES}
          description={t("noScoresBody")}
          heading={t("noScoresTitle")}
          scope="part"
        />
      );
    case "needMore":
      return (
        <OceanNotice
          action={
            props.canUpload ? (
              <Link
                className={aofButtonVariants({ size: "field" })}
                href={LAURA.PAGE.UPLOAD}
              >
                <IconUpload aria-hidden />
                {t("uploadMore")}
              </Link>
            ) : undefined
          }
          art={MASCOT.GAMES.NEED_MORE}
          description={t("needMoreBody", {
            have: props.have,
            needed: props.needed,
          })}
          heading={t("needMoreTitle")}
          scope="part"
        />
      );
    default:
      return null;
  }
};
