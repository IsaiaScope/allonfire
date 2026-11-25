"use client";

import { APP } from "@allonfire/design/apps/app";
import { AOFAddImagesSkeleton } from "@allonfire/ui/features/image/upload/components/aof-add-images-skeleton";
import { useTranslations } from "next-intl";
import { ADD_IMAGE_DRESSING } from "./add-image-dressing";

const APPS = { kind: "options", options: APP.OPTIONS } as const;

/**
 * The Add Images page while it waits for its Session: the shared skeleton in
 * the Back Office's Design, one Apps toggle for each App. A browser test sets
 * its height against the real form's, at a wide and a phone width.
 */
export const AddImageSkeleton = () => {
  const t = useTranslations("Images");
  return (
    <AOFAddImagesSkeleton
      apps={APPS}
      dressing={ADD_IMAGE_DRESSING}
      loading={t("loading")}
      title={t("add.title")}
    />
  );
};
