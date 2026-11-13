import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import {
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "@allonfire/ui/shared/components/aof-card";
import { IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ACTION_KANJI } from "../constants/action-kanji";
import { ActionKanji, kanjiAction } from "./brush-kanji";
import { CardFrame } from "./card-frame";

/**
 * What a Home card draws when it has no data to show, as a card in its own
 * frame (the title's line, then a box as tall as the chart the card draws),
 * so nothing moves between the skeleton, the data and these. Its `title` is
 * the card's own, when the card knows it before it reads (Users); one whose
 * title comes with the data (Storage's buckets) leaves the line empty, as its
 * skeleton does.
 */
const OverviewCardState = ({
  children,
  height,
  kanji,
  title,
}: {
  children: ReactNode;
  /** The chart's room, in px: the skeleton's, the data's. */
  height: number;
  kanji: string;
  title?: ReactNode;
}) => (
  <CardFrame kanji={kanji}>
    <AOFCardHeader>
      {title ?? <div aria-hidden className="h-7" />}
    </AOFCardHeader>
    <AOFCardContent>
      <div
        className="flex flex-col items-center justify-center gap-4 text-center"
        style={{ height }}
      >
        {children}
      </div>
    </AOFCardContent>
  </CardFrame>
);

export type OverviewCardStateProps = {
  height: number;
  kanji: string;
  text: string;
  title?: ReactNode;
};

/** A card's title line: the Section's icon and its name, as the data's card draws it. */
export const OverviewTitle = ({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) => (
  <AOFCardTitle className="flex min-h-7 items-center gap-2 text-lg">
    {icon}
    <h3>{text}</h3>
  </AOFCardTitle>
);

/**
 * The first read failed and there is nothing on screen to keep: the card
 * says so, and its one button, the App's blue, brushed 再 (again), asks
 * again. A failure never toasts here; a refresh that fails behind data does.
 */
export const OverviewFailed = ({
  retry,
  retryText,
  text,
  ...frame
}: OverviewCardStateProps & { retry: () => void; retryText: string }) => (
  <OverviewCardState {...frame}>
    <p className="max-w-xs" role="alert">
      {text}
    </p>
    <AOFButton
      className={kanjiAction()}
      onClick={retry}
      size="field"
      type="button"
    >
      <ActionKanji kanji={ACTION_KANJI.RETRY} />
      <IconRefresh aria-hidden />
      {retryText}
    </AOFButton>
  </OverviewCardState>
);

/**
 * The API refused the visitor (a Session that lost its Role meanwhile): the
 * card is there, the same size, and says why it has nothing, with no retry
 * and no toast, since asking again changes nothing.
 */
export const OverviewForbidden = ({
  text,
  ...frame
}: OverviewCardStateProps) => (
  <OverviewCardState {...frame}>
    <p className="max-w-xs text-muted-foreground" role="status">
      {text}
    </p>
  </OverviewCardState>
);
