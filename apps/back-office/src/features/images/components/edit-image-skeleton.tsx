import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { languageName } from "@allonfire/core/features/i18n/utils/language-name";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { IconPhotoEdit } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  FormActionsSkeleton,
  FormAlertSkeleton,
  FormSkeleton,
} from "@/shared/components/form-skeleton";
import { APP_ENTRY } from "@/shared/constants/apps";
import { ImageFact, ImageFacts } from "./image-facts";

/**
 * The Edit Image page while its Image is read, drawn as the form draws itself
 * so nothing moves when it arrives: the words that never change stand as they
 * are (the title, the facts' labels, each fieldset's name, the languages every
 * Image holds), and every value and control is a bar at its real size. Its
 * browser test sets its height against the real form's at a wide and a phone
 * width, so a change to the form that skips this turns that test red.
 */
export const EditImageSkeleton = () => {
  const t = useTranslations("Images");
  return (
    <FormSkeleton label={t("loading")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-bold text-2xl">
          <IconPhotoEdit aria-hidden className="size-7" />
          {t("edit.title")}
        </h1>
        <Bar className="w-32" part="button" tone="destructive" />
      </div>
      <section
        aria-hidden
        className="flex @2xl:flex-row flex-col @2xl:gap-6 gap-4"
      >
        <Bar className="size-40 shrink-0" part="tile" />
        <ImageFacts className="w-full @2xl:max-w-xl max-w-sm">
          <ImageFact
            className="col-span-2"
            label={t("column.name")}
            mono={false}
          >
            {/* Every name is a UUID and ".avif": it needs two lines until the page is wide. */}
            <div className="flex flex-col">
              <Bar className="h-6.5 w-full max-w-72" part="label" />
              <Bar className="@2xl:hidden h-6 w-24" part="label" />
            </div>
          </ImageFact>
          <ImageFact label={t("column.size")}>
            <Bar className="h-6 w-16" part="label" />
          </ImageFact>
          <ImageFact label={t("column.dimensions")}>
            <Bar className="h-6 w-24" part="label" />
          </ImageFact>
          <ImageFact label={t("column.created")}>
            <Bar className="h-6 w-28" part="label" />
          </ImageFact>
        </ImageFacts>
      </section>
      <div className="flex flex-1 flex-col">
        <div
          aria-hidden
          className="grid @2xl:grid-cols-2 grid-cols-1 @2xl:gap-x-6"
        >
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-bold text-base">
              {t("form.altGroup")}
            </legend>
            {I18N.BASE_LANGUAGES.map((language) => (
              <div className="flex flex-col gap-2" key={language}>
                <span className="font-bold text-sm">
                  {languageName(language)}
                </span>
                <Bar part="field" />
                <Bar part="error" />
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm leading-snug">
                {t("form.addLanguage")}
              </span>
              <Bar part="field" />
              <Bar part="error" />
            </div>
          </fieldset>
          <div className="flex flex-col gap-8">
            <fieldset className="flex min-w-0 flex-col">
              <legend className="mb-2 font-bold text-base">
                {t("form.access")}
              </legend>
              <div className="flex flex-col gap-2">
                <span className="font-bold text-sm">{t("form.accessWho")}</span>
                <Bar part="toggle" />
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
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
          </div>
          <FormAlertSkeleton className="@2xl:col-span-2 mt-4" />
        </div>
        <FormActionsSkeleton />
      </div>
    </FormSkeleton>
  );
};
