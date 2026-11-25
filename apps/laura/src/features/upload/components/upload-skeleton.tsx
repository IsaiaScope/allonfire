"use client";

import { ImageAccess } from "@allonfire/database/enums";
import { AOFAddImagesSkeleton } from "@allonfire/ui/features/image/upload/components/aof-add-images-skeleton";
import { useTranslations } from "next-intl";
import { UPLOAD } from "../constants/upload";
import { UPLOAD_DRESSING } from "./upload-dressing";

/**
 * The Upload page while it waits for its Session: the shared skeleton in
 * Laura's Design. A browser test sets its height against the real form's, at
 * a wide and a phone width.
 */
export const UploadSkeleton = () => {
  const t = useTranslations("Upload");
  return (
    <AOFAddImagesSkeleton
      access={ImageAccess.PRIVATE}
      apps={UPLOAD.APPS}
      dressing={UPLOAD_DRESSING}
      loading={t("loading")}
      title={t("title")}
    />
  );
};
