"use client";

import { cn } from "@allonfire/ui/lib/utils";
import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ImagePlus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const SENSORS = [
  PointerSensor.configure({
    activationConstraints(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return [
          new PointerActivationConstraints.Delay({
            value: 200,
            tolerance: 10,
          }),
        ];
      }
      return [new PointerActivationConstraints.Distance({ value: 5 })];
    },
  }),
  KeyboardSensor,
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type SortableImageProps = {
  url: string;
  index: number;
  fileName: string;
  onPreview: () => void;
  onRemove: () => void;
};

function SortableImage({
  url,
  index,
  fileName,
  onPreview,
  onRemove,
}: SortableImageProps) {
  const { ref, isDragging } = useSortable({ id: url, index });

  return (
    <div
      className={cn(
        "relative cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "z-20 opacity-50"
      )}
      ref={ref}
    >
      <span className="absolute -top-2 -left-2 z-10 flex size-5 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground shadow-sm">
        {index + 1}
      </span>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: drag-to-reorder handles keyboard via KeyboardSensor */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: click for preview, drag handled by dnd-kit */}
      {/* biome-ignore lint/performance/noImgElement: blob URL preview */}
      <img
        alt={fileName}
        className="aspect-square w-full select-none rounded-md border object-contain [-webkit-touch-callout:none]"
        draggable={false}
        height={200}
        onClick={onPreview}
        src={url}
        width={200}
      />
      <button
        className="absolute -top-2 -right-2 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80"
        onClick={onRemove}
        type="button"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

type ImageUploadProps = {
  imageFiles: File[];
  imagePreviewUrls: string[];
  onImagesAdd: (files: File[], previewUrls: string[]) => void;
  onImageRemove: (index: number) => void;
  onImagesReorder: (files: File[], previewUrls: string[]) => void;
};

export function ImageUpload({
  imageFiles,
  imagePreviewUrls,
  onImagesAdd,
  onImageRemove,
  onImagesReorder,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const validateAndAdd = useCallback(
    (fileList: FileList) => {
      const validFiles: File[] = [];
      const urls: string[] = [];

      for (const file of fileList) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: Invalid type. Use PNG, JPEG, or WebP.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: Too large. Max 10MB.`);
          continue;
        }
        validFiles.push(file);
        urls.push(URL.createObjectURL(file));
      }

      if (validFiles.length > 0) {
        onImagesAdd(validFiles, urls);
      }
    },
    [onImagesAdd]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndAdd(e.dataTransfer.files);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAdd(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm">Images</p>
        {imageFiles.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {imageFiles.length} selected
          </span>
        )}
      </div>

      <div
        className={cn(
          "min-h-[240px] w-full",
          imagePreviewUrls.length > 0
            ? "grid w-full grid-cols-1 gap-4 md:grid-cols-2"
            : ""
        )}
      >
        <button
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-4 text-center transition-colors",
            imagePreviewUrls.length === 0 && "min-h-[240px]",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          type="button"
        >
          <ImagePlus className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            {imageFiles.length > 0
              ? "Add more images"
              : "Drop images here or click to upload"}
          </p>
          <p className="text-muted-foreground/70 text-xs">
            PNG, JPEG, or WebP up to 10MB
          </p>
        </button>

        {imagePreviewUrls.length > 0 && (
          <DragDropProvider
            onDragEnd={(event) => {
              if (event.canceled) {
                return;
              }
              const newUrls = move(imagePreviewUrls, event);
              const newFiles = newUrls.map((url) => {
                const idx = imagePreviewUrls.indexOf(url);
                const file = imageFiles[idx];
                if (!file) {
                  throw new Error(`Missing file at index ${idx}`);
                }
                return file;
              });
              onImagesReorder(newFiles, newUrls);
            }}
            sensors={SENSORS}
          >
            <div className="grid grid-cols-3 gap-5 p-3 sm:grid-cols-4 lg:grid-cols-5">
              {imagePreviewUrls.map((url, index) => (
                <SortableImage
                  fileName={imageFiles[index]?.name ?? "Preview"}
                  index={index}
                  key={url}
                  onPreview={() => setPreviewIndex(index)}
                  onRemove={() => onImageRemove(index)}
                  url={url}
                />
              ))}
            </div>
          </DragDropProvider>
        )}
      </div>
      <input
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      {previewIndex !== null && imagePreviewUrls[previewIndex] && (
        <button
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center border-none bg-black/80 p-4"
          onClick={() => setPreviewIndex(null)}
          type="button"
        >
          {/* biome-ignore lint/performance/noImgElement: blob URL preview */}
          <img
            alt={imageFiles[previewIndex]?.name ?? "Upload preview"}
            className="max-h-[80vh] max-w-[min(90vw,800px)] rounded-xl border border-white/10 object-contain shadow-2xl"
            height={600}
            src={imagePreviewUrls[previewIndex]}
            width={600}
          />
        </button>
      )}
    </div>
  );
}
