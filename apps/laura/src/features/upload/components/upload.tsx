"use client";

import { ImageAccess } from "@allonfire/database/enums";
import { AOFAddImages } from "@allonfire/ui/features/image/upload/components/aof-add-images";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { invalidateGallery } from "@/features/gallery/utils/gallery-mutations";
import { LAURA } from "@/shared/constants/laura";
import { addImage } from "../actions/add-image";
import { UPLOAD } from "../constants/upload";
import { UPLOAD_DRESSING } from "./upload-dressing";

/**
 * The Upload page's form: the shared form (ui) in Laura's Design, saved by
 * `addImage`, which clears the Gallery's kept pages; a saved add opens the
 * Gallery with this browser's copies read again.
 */
export const Upload = () => {
  const t = useTranslations("Upload");
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => invalidateGallery(queryClient),
    [queryClient]
  );
  return (
    <AOFAddImages
      access={ImageAccess.PRIVATE}
      action={addImage}
      apps={UPLOAD.APPS}
      dressing={UPLOAD_DRESSING}
      labels={{
        added: (count) => t("added", { count }),
        submit: t("submit"),
        submitting: t("submitting"),
        title: t("title"),
      }}
      list={LAURA.PAGE.GALLERY}
      refresh={refresh}
    />
  );
};
