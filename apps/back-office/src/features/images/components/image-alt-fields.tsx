"use client";

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { languageName } from "@allonfire/core/features/i18n/utils/language-name";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { withAOFFieldGroup } from "@allonfire/ui/features/form/utils/form";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { IconLanguage, IconPlus, IconX } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import {
  addAltLanguage,
  isBaseLanguage,
  removeAltLanguage,
} from "../utils/image-alt";
import type { ImageAltValues } from "../utils/image-form-schema";

const START: { alt: ImageAltValues; picker?: string | undefined } = {
  alt: { en: "", it: "" },
  picker: "",
};

/**
 * The alt a group's state holds. A row removed from the Add form is read once
 * more by its group before that unmounts, when its values are already gone.
 */
const selectAlt = (state: {
  values: { alt: ImageAltValues } | undefined;
}): ImageAltValues => state.values?.alt ?? START.alt;

/** The form's words and the page's language, for a `render`, which calls no hooks. */
const WithWords = ({
  children,
}: {
  children: (words: {
    names: Intl.DisplayNames;
    t: ReturnType<typeof useTranslations>;
  }) => ReactNode;
}) => {
  const t = useTranslations("Images.form");
  const locale = useLocale();
  return children({
    names: new Intl.DisplayNames([locale], { type: "language" }),
    t,
  });
};

/** The button taking a language out of the form: a component, so its handler is a hook's, stable between renders. */
const RemoveLanguage = ({
  alt,
  language,
  setAlt,
}: {
  alt: ImageAltValues;
  language: keyof ImageAltValues & string;
  setAlt: (name: "alt", value: ImageAltValues) => void;
}) => {
  const t = useTranslations("Images.form");
  const remove = useCallback(
    () => setAlt("alt", removeAltLanguage(alt, language)),
    [alt, language, setAlt]
  );
  return (
    <AOFButton
      aria-label={t("removeLanguage", { language: languageName(language) })}
      onClick={remove}
      size="icon-field"
      type="button"
      variant="outline"
    >
      <IconX aria-hidden />
    </AOFButton>
  );
};

/**
 * Alt text, a field group both Image forms bind, laid out like the Apps: a
 * title, then a field under its language's name for each language the Image
 * holds (English and Italian always, and any other of core's catalogue the
 * Admin adds with the picker, each with a remove button the input's own
 * size). A language removed is left out of the form, so the Image loses it
 * on Save. The picker is the form's own: the action ignores it.
 */
export const ImageAltFields = withAOFFieldGroup({
  defaultValues: START,
  render: ({ group }) => (
    <WithWords>
      {({ names, t }) => (
        <group.Subscribe selector={selectAlt}>
          {(alt) => (
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 font-bold text-base">
                {t("altGroup")}
              </legend>
              {objectKeys(alt).map((language) => (
                <div className="flex flex-col gap-2" key={language}>
                  <span aria-hidden className="font-bold text-sm">
                    {languageName(language)}
                  </span>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <group.AppField name={`alt.${language}`}>
                        {(field) => (
                          <field.TextField
                            autoComplete="off"
                            clear={t("clearAlt", {
                              language: languageName(language),
                            })}
                            // The title above is drawn by the row; the label names the input and takes no room, so the remove button beside it lines up.
                            hideLabel
                            icon={<IconLanguage />}
                            label={languageName(language)}
                          />
                        )}
                      </group.AppField>
                    </div>
                    {isBaseLanguage(language) ? null : (
                      <RemoveLanguage
                        alt={alt}
                        language={language}
                        setAlt={group.setFieldValue}
                      />
                    )}
                  </div>
                </div>
              ))}
              <group.AppField
                listeners={{
                  onChange: ({ value }) => {
                    if (value) {
                      group.setFieldValue("alt", addAltLanguage(alt, value));
                      group.setFieldValue("picker", "");
                    }
                  },
                }}
                name="picker"
              >
                {(field) => (
                  <field.ComboboxField
                    empty={t("noLanguage")}
                    icon={<IconPlus />}
                    label={t("addLanguage")}
                    options={I18N.OPTIONAL_LANGUAGES.filter(
                      (language) => !(language in alt)
                    ).map((language) => ({
                      label: `${names.of(language) ?? language} (${languageName(language)})`,
                      value: language,
                    }))}
                    placeholder={t("languageSearch")}
                  />
                )}
              </group.AppField>
            </fieldset>
          )}
        </group.Subscribe>
      )}
    </WithWords>
  ),
});
