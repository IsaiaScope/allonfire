"use client";

import type { OceanArtKey } from "@allonfire/design/designs/ocean/mascot-art";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { ink } from "@allonfire/ui/shared/utils/skeleton-ink";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import { OceanArt } from "@/shared/components/ocean-art";
import { MASCOT } from "@/shared/constants/mascots";
import type { SubmitView } from "../utils/submit-view";
import { badgeTone, type Tone } from "../utils/tone";
import { BoardStat } from "./board-stat";

/** One thing the game earned: its colour picture and its words, cut after two lines, the badge growing to fit them. */
const ResultBadge = ({
  art,
  label,
  tone,
}: {
  art: OceanArtKey;
  label: string;
  tone: Tone;
}) => (
  <AOFBadge
    className={cn(
      "h-auto min-h-8 w-full justify-start gap-1.5 py-1 pl-2 text-[15px]",
      badgeTone({ tone })
    )}
    variant="secondary"
  >
    <OceanArt art={art} className="size-4 shrink-0" />
    <span className="line-clamp-2 min-w-0 whitespace-normal text-left">
      {label}
    </span>
  </AOFBadge>
);

/**
 * The badges' places while saving: the three a game can earn (a record, a
 * personal best, the rank across both columns from `sm`), so the dialog is as
 * tall when the answer arrives as it was while it was awaited.
 */
const BadgePlaceholders = () => (
  <div aria-hidden className="contents">
    <div className={cn(ink({ tone: "faint" }), "h-8")} data-placeholder />
    <div className={cn(ink({ tone: "faint" }), "h-8")} data-placeholder />
    <div
      className={cn(ink({ tone: "faint" }), "h-8.5 sm:col-span-2")}
      data-placeholder
    />
  </div>
);

/**
 * What saving a game earned, as badges in a grid under the figures: a column on
 * a phone, two from `sm` with the rank across both. The same badges as the
 * board's header, one tone each (a record's gold, a personal best's green, the
 * rank's teal), each with its own colour emoji and a label cut after two lines, the badge growing to fit it. While saving it draws the three places
 * faint and says so to a screen reader only (Play again shows it); the area keeps the height of all three, whichever a game earns, so nothing moves when
 * the answer arrives. A
 * failure or a refusal is the dialog's alert, never here. A live region, so
 * what arrives is read out.
 */
export const GameResult = ({ submit }: { submit: SubmitView }) => {
  const t = useTranslations("Games");
  const { GAMES } = MASCOT;
  return (
    <div
      className="grid min-h-28.5 grid-cols-1 content-start gap-2 sm:min-h-18.5 sm:grid-cols-2"
      data-slot="memory-result"
      role="status"
    >
      {submit.state === "submitting" ? (
        <>
          <p className="sr-only">{t("submitting")}</p>
          <BadgePlaceholders />
        </>
      ) : null}
      {submit.state === "saved" ? (
        <>
          {submit.score.isGlobalBest ? (
            <ResultBadge
              art={GAMES.BADGE_RECORD}
              label={t("newRecord")}
              tone="warning"
            />
          ) : null}
          {submit.score.isPersonalBest ? (
            <ResultBadge
              art={GAMES.BADGE_PERSONAL_BEST}
              label={t("personalBest")}
              tone="success"
            />
          ) : null}
          <dl className="contents">
            <BoardStat
              className="h-auto min-h-8 w-full py-1 text-[15px] sm:col-span-2"
              icon={
                <OceanArt art={GAMES.BADGE_RANK} className="size-4 shrink-0" />
              }
              label={t("rank")}
              labelled
              tone="primary"
            >
              {submit.score.rank}
            </BoardStat>
          </dl>
        </>
      ) : null}
    </div>
  );
};
