"use client";

import { Button } from "@allonfire/ui/components/button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

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

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {files.map((file, index) => (
        <div className="group relative" key={previewUrls[index]}>
          {/* biome-ignore lint/performance/noImgElement: blob URL preview cannot use next/image */}
          {/* biome-ignore lint/correctness/useImageSize: CSS controls dimensions via aspect-square */}
          <img
            alt={file.name}
            className="aspect-square w-full rounded-lg object-cover"
            src={previewUrls[index]}
          />
          <Button
            className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onRemove(index)}
            size="icon-xs"
            variant="destructive"
          >
            <X className="size-3" />
            <span className="sr-only">{t("remove", { name: file.name })}</span>
          </Button>
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {file.name}
          </p>
        </div>
      ))}
    </div>
  );
}
