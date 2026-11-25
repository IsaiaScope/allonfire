"use client";

import type { App } from "@allonfire/database/enums";
import { AOFAddImages } from "@allonfire/ui/features/image/upload/components/aof-add-images";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { addImage } from "../actions/add-image";
import { appOptionsOf } from "../utils/administered-apps";
import { invalidateImages } from "../utils/images-mutations";
import { ADD_IMAGE_DRESSING } from "./add-image-dressing";

/**
 * The Add Images form in the Back Office: the shared form (ui) in its own
 * Design, offering the Apps the visitor administers, saved by `addImage`,
 * which clears this App's Images and Storage caches; a saved add opens the
 * Images list with this browser's copies read again.
 */
export const AddImage = ({ apps }: { apps: readonly App[] }) => {
  const t = useTranslations("Images.add");
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => invalidateImages(queryClient),
    [queryClient]
  );
  return (
    <AOFAddImages
      action={addImage}
      apps={{ kind: "options", options: appOptionsOf(apps) }}
      dressing={ADD_IMAGE_DRESSING}
      labels={{
        added: (count) => t("added", { count }),
        submit: t("submit"),
        submitting: t("submitting"),
        title: t("title"),
      }}
      list={BACK_OFFICE.PAGE.STORAGE_IMAGES}
      refresh={refresh}
    />
  );
};
