"use client";

import { aofErrorMeta } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import type { ServiceType } from "@allonfire/database/enums";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFQuietToggle } from "@allonfire/ui/features/query/hooks/use-aof-quiet-toggle";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { SERVICES } from "../constants/services";
import { serviceEnabledMutation } from "../utils/services-mutations";

const choiceOf = (enabled: boolean) =>
  enabled ? SERVICES.CHOICE.ON : SERVICES.CHOICE.OFF;

/**
 * Turns a whole Service on or off: off, none of its providers sends, whatever
 * their own switch says. The switch shows a choice at once; once the choices
 * stop (`useAOFQuietToggle`) the last one is written to the cached list
 * (`serviceEnabledMutation`) and saved, so a burst is one write, and none when
 * it ends where it began. `enabled` follows the cache, so a save that fails
 * puts the switch back through it, and says so.
 */
export const ServiceSwitch = ({
  enabled,
  type,
}: {
  enabled: boolean;
  type: ServiceType;
}) => {
  const t = useTranslations("Services.serviceEnabled");
  const { mutate } = useMutation({
    ...serviceEnabledMutation(type),
    meta: aofErrorMeta(t("failed")),
  });
  const form = useAOFForm({ defaultValues: { enabled: choiceOf(enabled) } });
  // The cache is the truth: the field follows `enabled` whenever it changes
  // (another read, a rollback); nothing is sent.
  useEffect(() => {
    form.setFieldValue("enabled", choiceOf(enabled), {
      dontRunListeners: true,
    });
  }, [enabled, form]);
  const { set } = useAOFQuietToggle({
    // A refusal can undo the cache before a render saw it change, so the field
    // is put back here too: the Service kept its state.
    commit: (turnOn, options) =>
      mutate(turnOn, {
        ...options,
        onError: () =>
          form.setFieldValue("enabled", choiceOf(!turnOn), {
            dontRunListeners: true,
          }),
      }),
    confirmed: enabled,
  });
  return (
    <form.AppField
      listeners={{
        onChange: ({ value: choice }) => set(choice === SERVICES.CHOICE.ON),
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
