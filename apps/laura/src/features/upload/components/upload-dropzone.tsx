"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { ACCEPTED_INPUT_STRING } from "@/lib/file-validation";

type UploadDropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

export function UploadDropzone({ onFiles, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Upload");

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
        "flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-border border-dashed p-8 transition-colors",
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
        <p className="font-medium text-base">{t("dropzone")}</p>
        <p className="mt-1 text-muted-foreground text-sm">{t("fileTypes")}</p>
      </div>
      <input
        accept={ACCEPTED_INPUT_STRING}
        aria-hidden="true"
        className="hidden"
        id="photo-upload"
        multiple
        name="photo-upload"
        onChange={handleChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
    </button>
  );
}
