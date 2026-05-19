"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scaleIn, staggerContainer } from "@/lib/animation-variants";

type UploadPreviewGridProps = {
  files: File[];
  previewUrls: string[];
  onRemove: (index: number) => void;
};

export function UploadPreviewGrid({
  files,
  previewUrls,
  onRemove,
}: UploadPreviewGridProps) {
  const t = useTranslations("Upload");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const queuedRef = useRef<Set<string>>(new Set());

  // Read image dimensions from blob URLs for aspect-ratio-aware preview
  useEffect(() => {
    const currentUrls = new Set(previewUrls);

    // Clean up stale entries from removed files
    for (const url of queuedRef.current) {
      if (!currentUrls.has(url)) {
        queuedRef.current.delete(url);
        setDimensions((prev) => {
          const { [url]: _, ...rest } = prev;
          return rest;
        });
      }
    }

    // Queue new URLs for dimension measurement
    for (const url of previewUrls) {
      if (queuedRef.current.has(url)) {
        continue;
      }
      queuedRef.current.add(url);
      const img = new Image();
      img.onload = () => {
        setDimensions((prev) => ({
          ...prev,
          [url]: { width: img.naturalWidth, height: img.naturalHeight },
        }));
      };
      img.src = url;
    }
  }, [previewUrls]);

  // Escape key + scroll lock when preview modal is open
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setPreviewIndex(null);
    }
  }, []);

  useEffect(() => {
    if (previewIndex === null) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [previewIndex, handleKeyDown]);

  if (files.length === 0) {
    return null;
  }

  const previewUrl =
    previewIndex !== null ? previewUrls[previewIndex] : undefined;
  const previewDim = previewUrl ? dimensions[previewUrl] : undefined;
  const pw = previewDim?.width ?? 1;
  const ph = previewDim?.height ?? 1;

  return (
    <>
      <motion.div
        animate="visible"
        className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3 md:grid-cols-4"
        initial="hidden"
        variants={staggerContainer}
      >
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              className="relative"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              key={previewUrls[index]}
              layout
              variants={scaleIn}
            >
              <button
                className="w-full cursor-pointer border-none bg-transparent p-0"
                onClick={() => setPreviewIndex(index)}
                type="button"
              >
                {/* biome-ignore lint/performance/noImgElement: blob URL preview cannot use next/image */}
                {/* biome-ignore lint/correctness/useImageSize: CSS controls dimensions via aspect-square */}
                <img
                  alt={file.name}
                  className="aspect-square w-full rounded-lg border object-contain"
                  src={previewUrls[index]}
                />
              </button>
              <button
                className="absolute -top-2 -right-2 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80"
                onClick={() => {
                  setPreviewIndex(null);
                  onRemove(index);
                }}
                type="button"
              >
                <X className="size-3" />
                <span className="sr-only">
                  {t("remove", { name: file.name })}
                </span>
              </button>
              <p className="mt-1 truncate text-muted-foreground text-xs">
                {file.name}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {previewIndex !== null &&
        previewUrl &&
        createPortal(
          // biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click-to-close is standard for dialog overlays
          // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via global useEffect listener
          <div
            aria-label={t("preview")}
            aria-modal="true"
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 p-2"
            onClick={() => setPreviewIndex(null)}
            role="dialog"
          >
            <div
              className="relative overflow-hidden rounded-lg"
              style={{
                aspectRatio: `${pw} / ${ph}`,
                width: `min(94vw, calc((90vh - 3.5rem) * ${pw} / ${ph}))`,
                maxHeight: "calc(90vh - 3.5rem)",
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: blob URL preview cannot use next/image */}
              {/* biome-ignore lint/correctness/useImageSize: dimensions set via inline style */}
              <img
                alt={files[previewIndex]?.name ?? "Preview"}
                className="h-full w-full object-contain"
                src={previewUrl}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
