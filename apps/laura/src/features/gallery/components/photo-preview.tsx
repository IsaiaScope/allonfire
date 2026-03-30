"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

type PhotoPreviewProps = {
  photo: { id: string; url: string; width: number; height: number };
  onClose: () => void;
};

export function PhotoPreview({ photo, onClose }: PhotoPreviewProps) {
  const t = useTranslations("PhotoPreview");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click-to-close is standard for dialog overlays
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via global useEffect listener
    <div
      aria-label={t("ariaLabel")}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
    >
      <button
        aria-label={t("closeLabel")}
        className="absolute top-4 right-4 z-10 cursor-pointer rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        onClick={onClose}
        type="button"
      >
        <X className="size-6" />
      </button>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation prevents backdrop close when clicking the image */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: container stops event propagation to backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled by global listener */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          alt={t("fullSizeAlt")}
          className="max-h-[90vh] w-auto rounded-lg object-contain"
          height={photo.height}
          priority
          src={photo.url}
          width={photo.width}
        />
      </div>
    </div>
  );
}
