import { objectKeys } from "@allonfire/core/shared/utils/object";
import {
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconPhotoPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { CardFrame } from "@/shared/components/card-frame";
import {
  Bar,
  FormActionsSkeleton,
  FormAlertSkeleton,
  FormSkeleton,
} from "@/shared/components/form-skeleton";
import { APP_ENTRY } from "@/shared/constants/apps";
import { IMAGES } from "../constants/images";
import { sharedSet } from "../utils/add-image-layout";

/**
 * The Add Images page while it waits for its Session, drawn as the empty form
 * draws itself so nothing moves when it arrives: the words that never change
 * stand as they are (the title, the limits, each fieldset's name), and every
 * control is a bar at its real size. A page of this kind keeps a browser test
 * that sets its height against the real form's, at a wide and a phone width,
 * so a change to the form that skips this turns that test red.
 */
export const AddImageSkeleton = () => {
  const t = useTranslations("Images");
  return (
    <FormSkeleton label={t("loading")}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 font-bold text-2xl">
            <IconPhotoPlus aria-hidden className="size-7" />
            {t("add.title")}
          </h1>
          <Bar className="w-64" part="label" />
        </div>
        <Bar className="w-44" part="button" tone="primary" />
      </div>
      <div className="flex flex-1 flex-col gap-8">
        <CardFrame kanji={IMAGES.ADD_KANJI}>
          <AOFCardHeader>
            <Bar className="h-7 w-56" part="label" />
          </AOFCardHeader>
          <AOFCardContent>
            <div aria-hidden className={sharedSet({ part: "grid" })}>
              <fieldset className="flex min-w-0 flex-col">
                <legend className="mb-2 font-bold text-base">
                  {t("form.access")}
                </legend>
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-sm">
                    {t("form.accessWho")}
                  </span>
                  <Bar part="toggle" />
                </div>
              </fieldset>
              <div
                className={cn(
                  sharedSet({ part: "apps" }),
                  "flex flex-col gap-2"
                )}
              >
                <fieldset className="flex min-w-0 flex-col gap-4">
                  <legend className="mb-2 font-bold text-base">
                    {t("form.apps")}
                  </legend>
                  {objectKeys(APP_ENTRY).map((app) => (
                    <div className="flex flex-col gap-2" key={app}>
                      <Bar part="label" />
                      <Bar part="toggle" />
                    </div>
                  ))}
                </fieldset>
                <Bar part="error" />
              </div>
              <Bar
                className={sharedSet({ part: "apply" })}
                part="button"
                tone="primary"
              />
            </div>
          </AOFCardContent>
        </CardFrame>
        <p className="text-muted-foreground">{t("add.pick.none")}</p>
        <FormAlertSkeleton className="mt-4" />
        <FormActionsSkeleton />
      </div>
    </FormSkeleton>
  );
};
