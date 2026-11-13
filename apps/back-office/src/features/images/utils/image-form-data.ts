import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { ImageAccess } from "@allonfire/database/enums";
import { textOf } from "@/features/api/utils/api-refusal";
import type { AddImageRowValues } from "./add-image-schema";
import type { EditImageValues } from "./edit-image-schema";
import { isBaseLanguage } from "./image-alt";
import { imageAccessSchema, imageAppSchema } from "./image-form-schema";

/**
 * Where a picture's controls post their fields: under `prefix` (`rows[2].`
 * in the Add form, one per picked file; none in the Edit form).
 * @internal
 */
export const imageNames = (prefix: string) => ({
  access: `${prefix}access`,
  alt: (language: string) => `${prefix}alt.${language}`,
  apps: `${prefix}apps`,
  file: `${prefix}file`,
});

/**
 * The prefix of the Add form's `index`th row.
 * @internal
 */
export const rowPrefix = (index: number) => `rows[${index}].`;

/** The alt as posted: both Base languages, any other only where it was posted. */
const altOf = (form: FormData, prefix: string) => {
  const names = imageNames(prefix);
  return objectFromEntries(
    I18N.CONTENT_LANGUAGES.filter(
      (language) => isBaseLanguage(language) || form.has(names.alt(language))
    ).map((language) => [language, textOf(form, names.alt(language))] as const)
  );
};

/** The picture's fields as posted under `prefix`; an unknown choice reads as nothing, never an error. */
const valuesOf = (form: FormData, prefix: string): EditImageValues => {
  const names = imageNames(prefix);
  return {
    access: imageAccessSchema
      .catch(ImageAccess.PRIVATE)
      .parse(textOf(form, names.access)),
    alt: altOf(form, prefix),
    apps: form.getAll(names.apps).flatMap((value) => {
      const app = imageAppSchema.safeParse(value);
      return app.success ? [app.data] : [];
    }),
  };
};

/** The Edit form's fields as the schema reads them. */
export const editValuesOf = (form: FormData): EditImageValues =>
  valuesOf(form, "");

/** The Add form's rows in order, up to the first with no file. */
export const rowsOf = (form: FormData): AddImageRowValues[] => {
  const rows: AddImageRowValues[] = [];
  for (let index = 0; ; index += 1) {
    const prefix = rowPrefix(index);
    const file = form.get(imageNames(prefix).file);
    if (!(file instanceof File)) {
      return rows;
    }
    rows.push({ ...valuesOf(form, prefix), file });
  }
};

/**
 * The parts `POST /images` takes: every file, then one `meta` JSON text with
 * an entry per file in the same order.
 */
export const uploadFormOf = (rows: readonly AddImageRowValues[]) => ({
  file: rows.map(({ file }) => file),
  meta: stringifyJson(
    rows.map(({ access, alt, apps }) => ({ access, alt, apps }))
  ),
});
