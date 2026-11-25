"use client";

import type { App } from "@allonfire/database/enums";
import { IconCircleCheck, IconCircleOff } from "@tabler/icons-react";
import { withAOFFieldGroup } from "../../../form/utils/form";
import { FieldsWords } from "./fields-words";

const NO_APPS: { apps: App[] } = { apps: [] };
/** What the Design and the caller choose: the chosen option's colours (hex) and the Apps to choose among, each with its name. */
const APPS_PROPS: {
  ink: string;
  options: readonly { label: string; value: App }[];
  pill: string;
} = { ink: "", options: [], pill: "" };

/** The Apps the Image is in, among the `options` given: at least one. A field group every Image form binds. */
export const AOFImageAppsRow = withAOFFieldGroup({
  defaultValues: NO_APPS,
  props: APPS_PROPS,
  render: ({ group, ink, options, pill }) => (
    <FieldsWords>
      {(t) => (
        <group.AppField name="apps">
          {(field) => (
            <field.ToggleGroupField
              ink={ink}
              label={t("apps")}
              off={{ icon: <IconCircleOff />, label: t("appOut") }}
              on={{ icon: <IconCircleCheck />, label: t("appIn") }}
              options={options}
              pill={pill}
              required
            />
          )}
        </group.AppField>
      )}
    </FieldsWords>
  ),
});
