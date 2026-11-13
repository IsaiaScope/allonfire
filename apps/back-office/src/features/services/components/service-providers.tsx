"use client";

import { ServiceType } from "@allonfire/database/enums";
import { AOFEmpty } from "@allonfire/ui/features/feedback/components/aof-empty";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import {
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "@allonfire/ui/shared/components/aof-card";
import { IconKeyOff, IconMailCog } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { api } from "@/features/api/utils/api";
import { SectionLoading } from "@/features/navigation/components/section-loading";
import { CardFrame } from "@/shared/components/card-frame";
import { cardBadge } from "@/shared/utils/card-badge";
import { SERVICES } from "../constants/services";
import { type ListedProvider, servicesQuery } from "../utils/services-queries";
import { ProviderForm } from "./provider-form";
import { ProviderUsage } from "./provider-usage";
import { ServiceSwitch } from "./service-switch";
import { TestSend } from "./test-send";

/** A mail provider's card: who it is, a test, how much it used, its settings. */
const MailProviderCard = ({ provider }: { provider: ListedProvider }) => {
  const t = useTranslations("Services");
  return (
    <CardFrame kanji={SERVICES.CARD_KANJI}>
      {/* The name and its slot, under them whether its key is set; the test
          send on the right. */}
      <AOFCardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <AOFCardTitle className="text-lg">{provider.name}</AOFCardTitle>
            <AOFBadge className={cardBadge()} variant="outline">
              {t("slot", { slot: provider.slot })}
            </AOFBadge>
          </div>
          {provider.configured ? null : (
            <AOFBadge className={cardBadge()} variant="destructive">
              <IconKeyOff aria-hidden />
              {t("key.missing")}
            </AOFBadge>
          )}
        </div>
        <TestSend providerId={provider.id} />
      </AOFCardHeader>
      <AOFCardContent className="flex flex-col gap-6">
        <ProviderUsage provider={provider} />
        <ProviderForm key={provider.version} provider={provider} />
      </AOFCardContent>
    </CardFrame>
  );
};

/**
 * What draws each Service type's providers (ADR 0029): a new type adds its
 * own card here, and the compiler asks for it. The page, its switch and its
 * cache are the same for every type.
 */
const PROVIDER_CARD = {
  [ServiceType.MAIL]: MailProviderCard,
} as const satisfies Record<ServiceType, typeof MailProviderCard>;

/**
 * One Service under its page's title, its switch at the far right of the
 * title's row, and its providers in slot order. The page hands it the API's
 * answer already read (`servicesHydration`) and reads it back under the same
 * key (`servicesQuery`); an action that changes a Service or sends mail asks
 * again (`useRefreshServices`). A read the API refused is asked again here,
 * and shows its error.
 */
export type ServiceProvidersProps = {
  type: ServiceType;
  /** The page's heading, the switch at the row's far right. */
  title: ReactNode;
};

export const ServiceProviders = ({ title, type }: ServiceProvidersProps) => {
  const t = useTranslations("Services");
  const failed = useTranslations("Common.Request")("failed");
  const { data, isPending } = useQuery(servicesQuery(api, type));
  if (isPending) {
    return <SectionLoading />;
  }
  const service = data?.services.find((one) => one.type === type);
  if (!service) {
    return (
      <>
        {title}
        <AOFEmpty
          description={data ? t("empty.description") : ""}
          icon={<IconMailCog />}
          title={data ? t("empty.title") : failed}
        />
      </>
    );
  }
  const ProviderCard = PROVIDER_CARD[service.type];
  return (
    <section
      aria-label={t(`service.${service.type}`)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {title}
        <ServiceSwitch {...service} />
      </div>
      {service.providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </section>
  );
};
