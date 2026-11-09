"use client";

import type { ServiceType } from "@allonfire/database/enums";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { setServiceEnabled } from "../actions/services";
import { SERVICES } from "../constants/services";
import { useRefreshServices } from "../hooks/use-refresh-services";

const otherChoice = (value: string) =>
  value === SERVICES.CHOICE.ON ? SERVICES.CHOICE.OFF : SERVICES.CHOICE.ON;

/**
 * Turns a whole Service on or off, as soon as it is chosen: off, none of
 * its providers sends, whatever their own switch says. A save that fails
 * puts the switch back and says so.
 */
export const ServiceSwitch = ({
  enabled,
  type,
}: {
  enabled: boolean;
  type: ServiceType;
}) => {
  const t = useTranslations("Services.serviceEnabled");
  const [, startTransition] = useTransition();
  const refresh = useRefreshServices();
  const form = useAOFForm({
    defaultValues: {
      enabled: enabled ? SERVICES.CHOICE.ON : SERVICES.CHOICE.OFF,
    },
  });
  return (
    <form.AppField
      listeners={{
        onChange: ({ value }) =>
          startTransition(async () => {
            const saved = await setServiceEnabled(
              type,
              value === SERVICES.CHOICE.ON
            ).catch(() => false);
            if (saved) {
              refresh();
            } else {
              // The Service kept its state: the switch shows it again.
              form.setFieldValue("enabled", otherChoice(value), {
                dontRunListeners: true,
              });
              aofToast(t("failed"), "error");
            }
          }),
      }}
      name="enabled"
    >
      {(field) => (
        <field.ChoiceField
          ink={BACK_OFFICE.CHOSEN.INK}
          label={t("label")}
          options={[
            {
              icon: <IconPlayerPlay />,
              label: t("on"),
              value: SERVICES.CHOICE.ON,
            },
            {
              icon: <IconPlayerPause />,
              label: t("off"),
              value: SERVICES.CHOICE.OFF,
            },
          ]}
          pill={BACK_OFFICE.CHOSEN.PILL}
          size="sm"
        />
      )}
    </form.AppField>
  );
};
