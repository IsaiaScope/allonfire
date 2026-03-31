"use client";

import { Button } from "@allonfire/ui/components/button";
import { Progress } from "@allonfire/ui/components/progress";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadPhotoAction } from "@/features/upload/actions/upload";
import { convertHeicToJpeg } from "@/lib/convert-heic";
import { MAX_TOTAL_SIZE } from "@/lib/file-validation";
import { UploadDropzone } from "./upload-dropzone";
import { UploadPreviewGrid } from "./upload-preview-grid";

export function UploadClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const queryClient = useQueryClient();
  const urlsRef = useRef<string[]>([]);
  const t = useTranslations("Upload");

  urlsRef.current = previewUrls;

  useEffect(() => {
    return () => {
      for (const url of urlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const addFiles = useCallback(async (newFiles: File[]) => {
    setProcessing(true);
    try {
      const converted = await Promise.all(newFiles.map(convertHeicToJpeg));
      const newUrls = converted.map((f) => URL.createObjectURL(f));
      setFiles((prev) => [...prev, ...converted]);
      setPreviewUrls((prev) => [...prev, ...newUrls]);
    } finally {
      setProcessing(false);
    }
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

  async function handleUpload() {
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: files.length });
    let uploaded = 0;
    let failed = false;

    for (const file of files) {
      const formData = new FormData();
      formData.append("photo", file);

      const result = await uploadPhotoAction(formData);

      if (result.success) {
        uploaded++;
        setProgress({ current: uploaded, total: files.length });
      } else {
        const errorKey = `errors.${result.error}`;
        toast.error(t.has(errorKey) ? t(errorKey) : t("errorToast"));
        failed = true;
        break;
      }
    }

    if (uploaded > 0) {
      // Revoke URLs and remove only the successfully uploaded files
      for (let i = 0; i < uploaded; i++) {
        const url = previewUrls[i];
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
      setFiles((prev) => prev.slice(uploaded));
      setPreviewUrls((prev) => prev.slice(uploaded));
      await queryClient.invalidateQueries({ queryKey: ["photos"] });
    }

    if (!failed) {
      toast.success(t("successToast", { count: uploaded }));
    }

    setUploading(false);
    setProgress({ current: 0, total: 0 });
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const exceedsLimit = totalSize > MAX_TOTAL_SIZE;

  return (
    <div className="space-y-6">
      <UploadDropzone disabled={uploading || processing} onFiles={addFiles} />

      {processing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">{t("processing")}</p>
        </div>
      )}

      <UploadPreviewGrid
        files={files}
        onRemove={removeFile}
        previewUrls={previewUrls}
      />

      {uploading && progress.total > 0 && (
        <div className="space-y-2">
          <Progress value={(progress.current / progress.total) * 100} />
          <p className="text-center text-muted-foreground text-sm">
            {t("uploadingProgress", {
              current: progress.current,
              total: progress.total,
            })}
          </p>
        </div>
      )}

      {files.length > 0 && !uploading && (
        <div className="flex items-center justify-between">
          {exceedsLimit ? (
            <p className="font-medium text-destructive text-sm">
              {t("totalSizeWarning", {
                size: (totalSize / (1024 * 1024)).toFixed(1),
                limit: (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0),
              })}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("selectedCount", { count: files.length })}
            </p>
          )}
          <Button disabled={exceedsLimit} onClick={handleUpload}>
            <Upload className="size-4" />
            {t("uploadButton")}
          </Button>
        </div>
      )}
    </div>
  );
}
