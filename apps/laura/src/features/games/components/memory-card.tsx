"use client";

import type { HostLanguage } from "@allonfire/core/features/i18n/constants/locales";
import { aofAltFor } from "@allonfire/ui/features/image/utils/alt-for";
import { AOFStorageImage } from "@allonfire/ui/shared/components/aof-image";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { MemoryCard } from "../utils/deal-cards";
import { CardBack } from "./card-back";

export type MemoryCardButtonProps = {
  card: MemoryCard;
  /** The board holds a pair face up: no card answers a click. */
  isLocked: boolean;
  isFaceUp: boolean;
  isMatched: boolean;
  language: HostLanguage;
  /** Told the card's place on the board (its position, from 0). */
  onFlip: (index: number) => void;
  /** Its place in the board, 1-based, as a screen reader says it. */
  position: number;
};

/**
 * One card: a button that turns over. Face down it shows the Design's card
 * back; face up, the Image on its own blur, so the tile never flashes while
 * the picture loads. A matched or held card is `aria-disabled`, never
 * `disabled`: a disabled button drops out of the tab order and the focus
 * would jump away after a match. The turn is one `transform`, and only where
 * motion is welcome: under reduced motion the card changes at once.
 */
export const MemoryCardButton = ({
  card,
  isFaceUp,
  isLocked,
  isMatched,
  language,
  onFlip,
  position,
}: MemoryCardButtonProps) => {
  const t = useTranslations("Games");
  const alt = aofAltFor(card.image.alt, language);
  let label = t("cardFaceDown", { position });
  if (isMatched) {
    label = t("cardMatched", { alt, position });
  } else if (isFaceUp) {
    label = t("cardFaceUp", { alt, position });
  }
  const inert = isMatched || isLocked;
  const flip = useCallback(() => onFlip(position - 1), [onFlip, position]);
  return (
    <button
      aria-disabled={inert}
      aria-label={label}
      className="perspective-midrange relative size-full cursor-pointer rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default"
      onClick={inert ? undefined : flip}
      type="button"
    >
      <span
        className={cn(
          "transform-3d absolute inset-0 motion-safe:transition-transform motion-safe:duration-500",
          isFaceUp && "rotate-y-180"
        )}
        data-slot="memory-card-turn"
      >
        <span className="backface-hidden absolute inset-0 overflow-hidden rounded-lg border bg-secondary dark:bg-card">
          <CardBack />
        </span>
        <span
          className={cn(
            "backface-hidden absolute inset-0 rotate-y-180 overflow-hidden rounded-lg border bg-card bg-cover",
            isMatched && "ring-1 ring-primary/60"
          )}
          style={{
            backgroundImage: `url("${card.image.blurDataUrl}")`,
          }}
        >
          <AOFStorageImage
            className="size-full object-contain"
            image={card.image}
            language={language}
            placeholder="empty"
            sizes="25vw"
          />
        </span>
      </span>
    </button>
  );
};
