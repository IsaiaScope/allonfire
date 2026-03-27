"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type UploadDropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

export function UploadDropzone({ onFiles, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) {
        return;
      }

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onFiles(files);
      }
      e.target.value = "";
    },
    [onFiles]
  );

  return (
    <button
      className={cn(
        "flex min-h-60 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-border border-dashed p-8 transition-colors",
        isDragging && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-50"
      )}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      type="button"
    >
      <Upload className="size-10 text-muted-foreground" />
      <div className="text-center">
        <p className="font-medium text-base">
          Drop photos here or click to browse
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          PNG, JPEG, or WebP up to 10MB each
        </p>
      </div>
      <input
        accept={ACCEPTED_TYPES}
        className="hidden"
        multiple
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
    </button>
  );
}
