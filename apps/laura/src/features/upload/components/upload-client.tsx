"use client";

import { Button } from "@allonfire/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadPhotosAction } from "@/features/upload/actions/upload";
import { UploadDropzone } from "./upload-dropzone";
import { UploadPreviewGrid } from "./upload-preview-grid";

export function UploadClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const urlsRef = useRef<string[]>([]);
  const t = useTranslations("Upload");

  useEffect(() => {
    urlsRef.current = previewUrls;
    return () => {
      for (const url of urlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  const addFiles = useCallback((newFiles: File[]) => {
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  }, []);

  const removeFile = useCallback(
    (index: number) => {
      const url = previewUrls[index];
      if (url) {
        URL.revokeObjectURL(url);
      }
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    },
    [previewUrls]
  );

  function handleUpload() {
    if (files.length === 0) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("photos", file);
      }

      const result = await uploadPhotosAction(formData);

      if (result.success) {
        toast.success(t("successToast", { count: result.count }));
        setFiles([]);
        setPreviewUrls([]);
        await queryClient.invalidateQueries({ queryKey: ["photos"] });
      } else {
        toast.error(result.error ?? t("errorToast"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <UploadDropzone disabled={pending} onFiles={addFiles} />

      <UploadPreviewGrid
        files={files}
        onRemove={removeFile}
        previewUrls={previewUrls}
      />

      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("selectedCount", { count: files.length })}
          </p>
          <Button disabled={pending} onClick={handleUpload}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <Upload className="size-4" />
                {t("uploadButton")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
