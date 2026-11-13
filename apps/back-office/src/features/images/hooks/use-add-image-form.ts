import { type App, ImageAccess } from "@allonfire/database/enums";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import {
  type AddImageRowValues,
  addImageFormSchema,
} from "../utils/add-image-schema";
import type { ImageFieldMessages } from "../utils/image-form-schema";

/** What a picked file becomes in the form: its picture's fields, a key of its own (`id`) and the alt's picker. */
const NO_ROWS: AddImageRowValues[] = [];
type AddImageFormValues = {
  rows: AddImageRowValues[];
  shared: { access: ImageAccess; apps: App[] };
};

/** The form's fields: the rows, and the set new rows start from. */
const startOf = (apps: readonly App[]): AddImageFormValues => ({
  rows: NO_ROWS,
  shared: { access: ImageAccess.PRIVATE, apps: apps.slice(0, 1) },
});

export const useAddImageForm = (
  apps: readonly App[],
  messages: ImageFieldMessages
) =>
  useAOFForm({
    defaultValues: startOf(apps),
    validators: { onChange: addImageFormSchema(messages) },
  });
export type AddImageForm = ReturnType<typeof useAddImageForm>;
