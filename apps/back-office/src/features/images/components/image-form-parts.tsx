"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { type App, ImageAccess } from "@allonfire/database/enums";
import { withAOFFieldGroup } from "@allonfire/ui/features/form/utils/form";
import {
  IconCircleCheck,
  IconCircleOff,
  IconLock,
  IconWorld,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FormActions, type FormSubmit } from "@/shared/components/form-actions";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/** The Image forms' words, for a field group's `render`, which calls no hooks. */
const Words = ({
  children,
  namespace,
}: {
  children: (t: ReturnType<typeof useTranslations>) => ReactNode;
  namespace: "Images" | "Images.form";
}) => children(useTranslations(namespace));

/** Each access choice's pictogram. */
const ACCESS_ICON = {
  [ImageAccess.PRIVATE]: <IconLock />,
  [ImageAccess.PUBLIC]: <IconWorld />,
} satisfies Record<ImageAccess, ReactNode>;

const PRIVATE_START: { access: ImageAccess } = {
  access: ImageAccess.PRIVATE,
};

/** Public or private: the Image's own, never per App. A field group both Image forms bind. */
export const ImageAccessRow = withAOFFieldGroup({
  defaultValues: PRIVATE_START,
  render: ({ group }) => (
    <Words namespace="Images">
      {(t) => (
        <fieldset className="flex min-w-0 flex-col">
          <legend className="mb-2 font-bold text-base">
            {t("form.access")}
          </legend>
          <div className="flex flex-col gap-2">
            <span aria-hidden className="font-bold text-sm">
              {t("form.accessWho")}
            </span>
            <group.AppField name="access">
              {(field) => (
                <field.ChoiceField
                  ink={BACK_OFFICE.CHOSEN.INK}
                  label={t("form.access")}
                  options={objectValues(ImageAccess).map((access) => ({
                    icon: ACCESS_ICON[access],
                    label: t(`access.${access}`),
                    value: access,
                  }))}
                  pill={BACK_OFFICE.CHOSEN.PILL}
                />
              )}
            </group.AppField>
          </div>
        </fieldset>
      )}
    </Words>
  ),
});

const NO_APPS: { apps: App[] } = { apps: [] };
const APPS_PROPS: { offered: readonly App[] } = { offered: [] };

/** The Apps the Image is in, among the `offered` ones: at least one. A field group both Image forms bind. */
export const ImageAppsRow = withAOFFieldGroup({
  defaultValues: NO_APPS,
  props: APPS_PROPS,
  render: ({ group, offered }) => (
    <Words namespace="Images.form">
      {(t) => (
        <group.AppField name="apps">
          {(field) => (
            <field.ToggleGroupField
              ink={BACK_OFFICE.CHOSEN.INK}
              label={t("apps")}
              off={{ icon: <IconCircleOff />, label: t("appOut") }}
              on={{ icon: <IconCircleCheck />, label: t("appIn") }}
              options={offered.map((app) => ({
                label: APP_ENTRY[app].name,
                value: app,
              }))}
              pill={BACK_OFFICE.CHOSEN.PILL}
              required
            />
          )}
        </group.AppField>
      )}
    </Words>
  ),
});

/** An Image form's last row: Cancel back to the list, and its submit, both kanji buttons. */
export const ImageFormActions = ({
  disabled,
  pending,
  submit,
}: {
  /** Nothing to submit yet. */
  disabled?: boolean | undefined;
  pending: boolean;
  submit: FormSubmit;
}) => {
  const t = useTranslations("Images.form");
  return (
    <FormActions
      cancelHref={BACK_OFFICE.PAGE.STORAGE_IMAGES}
      cancelLabel={t("cancel")}
      disabled={disabled}
      pending={pending}
      submit={submit}
    />
  );
};
