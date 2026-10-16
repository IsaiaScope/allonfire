import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";

export type EkiStampProps = ComponentPropsWithoutChildren<"div"> & {
  /** The figure in the middle: an error's status (404). */
  code: string;
  /** What the station says, in kana, under the figure (回送). */
  kana: string;
  /** The station's name around the top of the ring: the App. */
  station: string;
};

/**
 * An eki stamp (駅スタンプ), the ink stamp every Japanese station keeps for
 * travellers to press into a notebook: a vermilion double ring with the
 * station's name, a large figure and a word in kana, pressed slightly askew
 * and in once (never for reduced motion). Round because a stamp is round.
 * Decoration only: the page says the same in its heading.
 */
export const EkiStamp = ({
  className,
  code,
  kana,
  station,
  ...props
}: EkiStampProps) => (
  <div
    aria-hidden
    className={cn(
      "relative flex size-56 shrink-0 -rotate-6 flex-col items-center justify-center gap-1 rounded-full border-4 border-hanko text-hanko motion-safe:animate-stamp sm:size-64",
      className
    )}
    {...props}
  >
    <div className="absolute inset-2 rounded-full border-2 border-hanko" />
    <span className="font-bold text-xs uppercase tracking-[0.3em] sm:text-sm">
      {station}
    </span>
    <span className="font-extrabold text-7xl tabular-nums leading-none sm:text-8xl">
      {code}
    </span>
    <span className="h-0.5 w-24 bg-hanko" />
    <span className="font-bold text-2xl tracking-[0.4em]" lang="ja">
      {kana}
    </span>
  </div>
);
