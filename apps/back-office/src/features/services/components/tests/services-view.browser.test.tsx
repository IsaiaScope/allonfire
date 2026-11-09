// @module-tag integration

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { ServiceType } from "@allonfire/database/enums";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { servicesListKey } from "../../utils/services-queries";
import { ServicesView } from "../services-view";

vi.mock("../../actions/services", () => ({
  saveProvider: vi.fn(),
  sendTestEmail: vi.fn(),
  setServiceEnabled: vi.fn(),
}));

const t = EN.Services;
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

const renderView = (services: unknown) => {
  const client = new QueryClient();
  client.setQueryData(servicesListKey(ServiceType.MAIL), services as never);
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={aofMessages("en", EN)}
      >
        <ServicesView title={<h1>Mail</h1>} type={ServiceType.MAIL} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
};

it("draws the providers it was handed, without asking the API", async () => {
  await renderView({
    services: [
      { enabled: true, providers: [PROVIDER], type: ServiceType.MAIL },
    ],
  });
  await expect.element(page.getByText("Provider One")).toBeVisible();
  await expect
    .element(
      page.getByRole("img", {
        name: t.usage.day.replace("{used}", "3").replace("{limit}", "100"),
      })
    )
    .toBeVisible();
});

it("says there is nothing when the answer holds no such Service", async () => {
  await renderView({ services: [] });
  await expect.element(page.getByText(t.empty.title)).toBeVisible();
});
