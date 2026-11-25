import { type App, ImageAccess } from "@allonfire/database/enums";
import { useTranslations } from "next-intl";
import { useAOFForm } from "../../../form/utils/form";
import {
  type AddImageRowValues,
  addImageFormSchema,
} from "../utils/add-image-schema";

const NO_ROWS: AddImageRowValues[] = [];
type AddImagesFormValues = {
  rows: AddImageRowValues[];
  shared: { access: ImageAccess; apps: App[] };
};

/** The form's fields: the rows, and the set new rows start from. */
const startOf = (
  apps: readonly App[],
  fixed: boolean
): AddImagesFormValues => ({
  rows: NO_ROWS,
  shared: {
    access: ImageAccess.PRIVATE,
    apps: fixed ? [...apps] : apps.slice(0, 1),
  },
});

/**
 * The Add Images form's state, an AOF form (ADR 0017): its rows, and the set
 * new rows start from (private, the first of `apps`, or all of them when
 * `fixed`: the Apps no one chooses). Checked with the page's own words.
 */
export const useAddImagesForm = (apps: readonly App[], fixed: boolean) => {
  const t = useTranslations("Common.ImageUpload.field");
  return useAOFForm({
    defaultValues: startOf(apps, fixed),
    validators: {
      onChange: addImageFormSchema({
        altTooLong: t("altTooLong"),
        appsRequired: t("appsRequired"),
        fileTooLarge: t("fileTooLarge"),
        tooManyFiles: t("tooManyFiles"),
        totalTooLarge: t("totalTooLarge"),
      }),
    },
  });
};
export type AddImagesForm = ReturnType<typeof useAddImagesForm>;
