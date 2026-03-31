"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createPortal } from "react-dom";

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

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {files.map((file, index) => (
          <div className="relative" key={previewUrls[index]}>
            <button
              className="w-full cursor-pointer border-none bg-transparent p-0"
              onClick={() => setPreviewIndex(index)}
              type="button"
            >
              {/* biome-ignore lint/performance/noImgElement: blob URL preview cannot use next/image */}
              {/* biome-ignore lint/correctness/useImageSize: CSS controls dimensions via aspect-square */}
              <img
                alt={file.name}
                className="aspect-square w-full rounded-lg object-cover"
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
          </div>
        ))}
      </div>

      {previewIndex !== null &&
        previewUrls[previewIndex] &&
        createPortal(
          <button
            className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center border-none bg-black/80 p-4"
            onClick={() => setPreviewIndex(null)}
            type="button"
          >
            {/* biome-ignore lint/performance/noImgElement: blob URL preview */}
            <img
              alt={files[previewIndex]?.name ?? "Preview"}
              className="max-h-[80vh] max-w-[min(90vw,800px)] rounded-xl border border-white/10 object-contain shadow-2xl"
              height={600}
              src={previewUrls[previewIndex]}
              width={600}
            />
          </button>,
          document.body
        )}
    </>
  );
}
