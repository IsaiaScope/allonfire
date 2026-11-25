"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { ImageAccess } from "@allonfire/database/enums";
import { IconLock, IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { withAOFFieldGroup } from "../../../form/utils/form";
import { FieldsWords } from "./fields-words";

/** Each access choice's pictogram. */
const ACCESS_ICON = {
  [ImageAccess.PRIVATE]: <IconLock />,
  [ImageAccess.PUBLIC]: <IconWorld />,
} satisfies Record<ImageAccess, ReactNode>;

const PRIVATE_START: { access: ImageAccess } = {
  access: ImageAccess.PRIVATE,
};

/** What the Design chooses: the chosen option's colours, as hex. */
const NO_COLOURS: { ink: string; pill: string } = { ink: "", pill: "" };

/** Public or private: the Image's own, never per App. A field group every Image form binds. */
export const AOFImageAccessRow = withAOFFieldGroup({
  defaultValues: PRIVATE_START,
  props: NO_COLOURS,
  render: ({ group, ink, pill }) => (
    <FieldsWords>
      {(t) => (
        <fieldset className="flex min-w-0 flex-col">
          <legend className="mb-2 font-bold text-base">{t("access")}</legend>
          <div className="flex flex-col gap-2">
            <span aria-hidden className="font-bold text-sm">
              {t("accessWho")}
            </span>
            <group.AppField name="access">
              {(field) => (
                <field.ChoiceField
                  ink={ink}
                  label={t("access")}
                  options={objectValues(ImageAccess).map((access) => ({
                    icon: ACCESS_ICON[access],
                    label: t(`option.${access}`),
                    value: access,
                  }))}
                  pill={pill}
                />
              )}
            </group.AppField>
          </div>
        </fieldset>
      )}
    </FieldsWords>
  ),
});
