"use client";

import { AOFUserAvatar } from "@allonfire/ui/features/image/components/aof-user-avatar";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { OceanArt } from "@/shared/components/ocean-art";
import type { LeaderboardEntry } from "../utils/leaderboard-queries";
import { type Place, PODIUM } from "../utils/podium";
import { MovesChip, TimeChip } from "./figure-chips";
import { podiumBox, step } from "./leaderboard-podium-styles";

const AVATAR_PX = 56;

/** The trophy's side on each step, in step with its number. */
const trophy = cva("", {
  variants: { place: { 1: "size-10", 2: "size-8", 3: "size-6" } },
});

/** One place of the podium: the player's face, the name, the figures, the step. */
const PodiumPlace = ({
  entry,
  place,
}: {
  entry: LeaderboardEntry;
  place: Place;
}) => {
  const t = useTranslations("Games");
  const name = entry.name ?? t("anonymous");
  const { tone, trophy: art } = PODIUM[place];
  return (
    <li className="flex min-w-0 flex-col items-center">
      <AOFUserAvatar
        blurDataUrl={entry.imageBlurDataUrl}
        className={cn(entry.isMe && place !== 1 && "ring-2 ring-primary")}
        image={entry.image}
        name={name}
        side={AVATAR_PX}
        style={{ height: AVATAR_PX, width: AVATAR_PX }}
      />
      <span
        className={cn(
          "mt-1 w-full truncate text-center text-sm",
          entry.isMe ? "font-bold" : "font-medium"
        )}
        title={name}
      >
        {name}
      </span>
      <dl className="mt-1 flex flex-wrap items-center justify-center gap-1 text-xs">
        <MovesChip className="h-5 min-w-5" moves={entry.moves} tone={tone} />
        <TimeChip className="h-5 min-w-5" timeMs={entry.timeMs} tone={tone} />
      </dl>
      <div aria-hidden className={step({ place })}>
        {place}
        <OceanArt art={art} className={trophy({ place })} />
      </div>
    </li>
  );
};

/** A place nobody holds yet: its step stands empty, outlined, with its number. */
const FreePlace = ({ place }: { place: Place }) => (
  <li className="flex min-w-0 flex-col justify-end">
    <div
      aria-hidden
      className={cn(
        step({ place }),
        "justify-start border-2 border-border border-dashed bg-transparent pt-2 text-muted-foreground"
      )}
    >
      {place}
    </div>
  </li>
);

/**
 * The first three on a podium, as a game's: the first in the middle and tallest,
 * the second on the left, the third on the right.
 * A place nobody holds is an empty outlined step, so the podium is as tall
 * with no player at all as with three. A picture of the top
 * of the table below (which lists everyone and is what a screen reader
 * reads), so it is hidden from one. Its height is fixed: the skeleton has the
 * same.
 */
export const LeaderboardPodium = ({
  entries,
}: {
  entries: LeaderboardEntry[];
}) => {
  const [first, second, third] = entries;
  return (
    <ol aria-hidden className={podiumBox()} data-slot="leaderboard-podium">
      {(
        [
          [2, second],
          [1, first],
          [3, third],
        ] as const
      ).map(([place, entry]) =>
        entry ? (
          <PodiumPlace entry={entry} key={place} place={place} />
        ) : (
          <FreePlace key={place} place={place} />
        )
      )}
    </ol>
  );
};
