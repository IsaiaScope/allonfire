import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { OceanArt } from "@/shared/components/ocean-art";
import { PODIUM, placeOf } from "../utils/podium";

/**
 * A player's place: the podium wears its colour medal (the number stays for a
 * screen reader), every other place is a plain number.
 */
export const RankBadge = ({
  large,
  rank,
}: {
  /** A bigger medal, for a card. */
  large?: boolean;
  rank: number;
}) => {
  const place = placeOf(rank);
  if (place) {
    return (
      <span className="flex min-w-8 justify-center">
        <OceanArt
          art={PODIUM[place].medal}
          className={large ? "size-9" : "size-6"}
        />
        <span className="sr-only">{rank}</span>
      </span>
    );
  }
  return (
    <AOFBadge
      className="min-w-8 justify-center bg-transparent font-mono text-foreground tabular-nums"
      variant="outline"
    >
      {rank}
    </AOFBadge>
  );
};
