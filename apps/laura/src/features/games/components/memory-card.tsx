"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Heart } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type MemoryCardProps = {
  index: number;
  thumbnailUrl: string;
  blurDataURL: string;
  isFlipped: boolean;
  isMatched: boolean;
  disabled: boolean;
  onFlip: () => void;
};

export function MemoryCard({
  index,
  thumbnailUrl,
  blurDataURL,
  isFlipped,
  isMatched,
  disabled,
  onFlip,
}: MemoryCardProps) {
  const t = useTranslations("Games");
  const showFace = isFlipped || isMatched;

  let ariaLabel: string;
  if (isMatched) {
    ariaLabel = t("cardMatched", { index: index + 1 });
  } else if (showFace) {
    ariaLabel = t("flipCard", { index: index + 1 });
  } else {
    ariaLabel = t("cardFaceDown", { index: index + 1 });
  }

  return (
    <button
      aria-label={ariaLabel}
      className="perspective-[1000px] relative aspect-square w-full cursor-pointer"
      disabled={disabled || isMatched}
      onClick={onFlip}
      type="button"
    >
      <div
        className={cn(
          "transform-3d relative size-full transition-transform duration-500",
          showFace && "transform-[rotateY(180deg)]"
        )}
      >
        {/* Back face (card back — Stitch-inspired glass design) */}
        <div
          className={cn(
            "backface-hidden absolute inset-0 overflow-hidden rounded-lg",
            "shadow-xl ring-1 ring-white/10",
            isMatched && "opacity-60"
          )}
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--primary) 40%, transparent) 0%, color-mix(in oklch, var(--background) 80%, transparent) 100%)",
          }}
        >
          {/* Radial highlight top-left */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at top left, var(--primary), transparent)",
            }}
          />
          {/* Radial highlight bottom-right */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(circle at bottom right, color-mix(in oklch, var(--primary) 60%, transparent), transparent)",
            }}
          />
          {/* Center glow */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="size-1/2 rounded-full bg-white blur-2xl" />
          </div>
          {/* Heart icon bottom-right */}
          <div className="absolute right-2 bottom-2">
            <Heart className="size-4 fill-white/40 text-white/40" />
          </div>
        </div>

        {/* Front face (photo — visible when flipped) */}
        <div
          className={cn(
            "backface-hidden transform-[rotateY(180deg)] absolute inset-0 overflow-hidden rounded-lg",
            isMatched && "ring-2 ring-green-500"
          )}
        >
          <Image
            alt=""
            blurDataURL={blurDataURL}
            className="size-full object-cover"
            fill
            placeholder="blur"
            sizes="(max-width: 640px) 25vw, 150px"
            src={thumbnailUrl}
          />
        </div>
      </div>
    </button>
  );
}
