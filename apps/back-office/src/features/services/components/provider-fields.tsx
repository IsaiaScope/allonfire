"use client";

import { withAOFFieldGroup } from "@allonfire/ui/features/form/utils/form";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconAt,
  IconCalendarStats,
  IconCircleCheck,
  IconCircleOff,
  IconSun,
  IconTag,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { SERVICES } from "../constants/services";

/** The Services words, handed to a field group's `render`, which calls no hooks. */
const WithWords = ({
  children,
}: {
  children: (t: ReturnType<typeof useTranslations>) => ReactNode;
}) => children(useTranslations("Services"));

/** A Gooey choice under its visible label, as the Role rows draw theirs. */
const ChoiceRow = ({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) => (
  <div className={cn("mb-8 flex flex-col gap-2", className)}>
    <span aria-hidden className="font-bold text-sm">
      {label}
    </span>
    {children}
  </div>
);

const CHOSEN = { ink: BACK_OFFICE.CHOSEN.INK, pill: BACK_OFFICE.CHOSEN.PILL };

const NO_SWITCHES = { enabled: "" };

/**
 * Whether the provider is enabled: a Gooey choice under the inputs, a field
 * group the provider form binds.
 */
export const ProviderSwitches = withAOFFieldGroup({
  defaultValues: NO_SWITCHES,
  render: ({ group }) => (
    <WithWords>
      {(t) => (
        <>
          {/* A row of its own, under the inputs. */}
          <ChoiceRow className="@2xl:col-start-1" label={t("enabled.label")}>
            <group.AppField name="enabled">
              {(field) => (
                <field.ChoiceField
                  {...CHOSEN}
                  label={t("enabled.label")}
                  options={[
                    {
                      icon: <IconCircleCheck />,
                      label: t("enabled.on"),
                      value: SERVICES.CHOICE.ON,
                    },
                    {
                      icon: <IconCircleOff />,
                      label: t("enabled.off"),
                      value: SERVICES.CHOICE.OFF,
                    },
                  ]}
                />
              )}
            </group.AppField>
          </ChoiceRow>
        </>
      )}
    </WithWords>
  ),
});

const NO_IDENTITY = { fromAddress: "", name: "" };

/** The provider's name and sender: a field group the provider form binds. */
export const ProviderIdentity = withAOFFieldGroup({
  defaultValues: NO_IDENTITY,
  render: ({ group }) => (
    <WithWords>
      {(t) => (
        <>
          <group.AppField name="name">
            {(field) => (
              <field.TextField
                autoComplete="off"
                icon={<IconTag />}
                label={t("field.name")}
                required
              />
            )}
          </group.AppField>
          <group.AppField name="fromAddress">
            {(field) => (
              <field.TextField
                autoComplete="off"
                icon={<IconAt />}
                inputMode="email"
                label={t("field.fromAddress")}
                required
                spellCheck={false}
                type="email"
              />
            )}
          </group.AppField>
        </>
      )}
    </WithWords>
  ),
});

const NO_LIMITS = { dailyLimit: "", monthlyLimit: "" };

/** The provider's limits: a field group the provider form binds. */
export const ProviderLimits = withAOFFieldGroup({
  defaultValues: NO_LIMITS,
  render: ({ group }) => (
    <WithWords>
      {(t) => (
        <>
          <group.AppField name="dailyLimit">
            {(field) => (
              <field.TextField
                icon={<IconSun />}
                inputMode="numeric"
                label={t("field.dailyLimit")}
                required
              />
            )}
          </group.AppField>
          <group.AppField name="monthlyLimit">
            {(field) => (
              <field.TextField
                icon={<IconCalendarStats />}
                inputMode="numeric"
                label={t("field.monthlyLimit")}
              />
            )}
          </group.AppField>
        </>
      )}
    </WithWords>
  ),
});

/** How the provider form names its fields for each group. */
export const PROVIDER_FIELDS = {
  IDENTITY: {
    fromAddress: "fromAddress",
    name: "name",
  },
  LIMITS: {
    dailyLimit: "dailyLimit",
    monthlyLimit: "monthlyLimit",
  },
  SWITCHES: { enabled: "enabled" },
} as const;
