import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { ServiceType } from "@allonfire/database/enums";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import EN from "../../i18n/translations/en.json" with { type: "json" };
import { type ServiceList, servicesListKey } from "../utils/services-queries";

/** A configured Mail provider, with the usage it has spent. */
const PROVIDER = {
  configured: true,
  dailyLimit: 100,
  enabled: true,
  fromAddress: "no-reply@view.test",
  id: "provider-0",
  lastAcceptedAt: null,
  monthlyLimit: 3000,
  name: "Provider One",
  slot: 0,
  usage: { day: 3, dayLimit: null, month: 40, monthLimit: null },
  version: "v-1",
};

/** The Mail Service holding `PROVIDER`. */
export const SERVICES: ServiceList = {
  services: [{ enabled: true, providers: [PROVIDER], type: ServiceType.MAIL }],
};

/** `children` with the Mail list already in the query cache, so the API is never asked. */
export const renderWithServices = (
  services: ServiceList,
  children: ReactNode
) => {
  const client = new QueryClient();
  client.setQueryData(servicesListKey(ServiceType.MAIL), services);
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={aofMessages("en", EN)}
      >
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
};
