"use client";

import { cn } from "@allonfire/ui/lib/utils";
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
      className={cn(
        "perspective-[1000px] relative size-full cursor-pointer",
        isMatched && "animate-match-pulse"
      )}
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
        {/* Back face (card back) */}
        <div
          className={cn(
            "backface-hidden absolute inset-0 overflow-hidden rounded-lg",
            "shadow-xl ring-1 ring-white/10",
            isMatched && "opacity-60"
          )}
          style={{
            backgroundColor: "var(--accent)",
          }}
        >
          {/* Laura logo watermark — light/dark variants */}
          <Image
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-contain dark:hidden"
            fill
            sizes="(max-width: 640px) 25vw, (max-width: 1024px) 130px, 170px"
            src="/memory-card-back-light.png"
          />
          <Image
            alt=""
            aria-hidden="true"
            className="absolute inset-0 hidden size-full object-contain dark:block"
            fill
            sizes="(max-width: 640px) 25vw, (max-width: 1024px) 130px, 170px"
            src="/memory-card-back-dark.png"
          />
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, transparent 0%, color-mix(in srgb, var(--accent) 80%, black) 100%)",
            }}
          />
        </div>

        {/* Front face (photo — visible when flipped) */}
        <div
          className={cn(
            "backface-hidden transform-[rotateY(180deg)] absolute inset-0 overflow-hidden rounded-lg bg-muted"
          )}
        >
          <Image
            alt=""
            blurDataURL={blurDataURL}
            className="size-full object-contain"
            fill
            placeholder="blur"
            sizes="(max-width: 640px) 25vw, (max-width: 1024px) 130px, 170px"
            src={thumbnailUrl}
          />
        </div>
      </div>
    </button>
  );
}
