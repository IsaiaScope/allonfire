// @module-tag integration

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import type { ListedProvider } from "../../utils/services-queries";
import { ProviderUsage } from "../provider-usage";

vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const t = EN.Services.usage;
const USED = { day: 3, month: 40 };

const providerWith = (
  overrides: Partial<ListedProvider> = {}
): ListedProvider => ({
  configured: true,
  dailyLimit: 100,
  enabled: true,
  fromAddress: "no-reply@usage.test",
  id: "provider-0",
  lastAcceptedAt: null,
  monthlyLimit: 3000,
  name: "Provider 1",
  slot: 0,
  usage: { ...USED, dayLimit: null, monthLimit: null },
  version: "v-1",
  ...overrides,
});

const renderUsage = (provider: ListedProvider) =>
  render(
    <NextIntlClientProvider
      locale={I18N.DEFAULT_LANGUAGE}
      messages={aofMessages("en", EN)}
    >
      <ProviderUsage provider={provider} />
    </NextIntlClientProvider>
  );

const ring = (name: string) => page.getByRole("img", { name });

beforeEach(() => {
  vi.mocked(aofToast).mockReset();
});

it("draws both rings from what the provider reports, against the provider's own limits", async () => {
  await renderUsage(providerWith());
  await expect
    .element(ring(t.day.replace("{used}", "3").replace("{limit}", "100")))
    .toBeVisible();
  await expect
    .element(ring(t.month.replace("{used}", "40").replace("{limit}", "3000")))
    .toBeVisible();
  expect(aofToast).not.toHaveBeenCalled();
});

it("takes the day's limit from the provider's API when it reports one", async () => {
  await renderUsage(
    providerWith({ usage: { ...USED, dayLimit: 300, monthLimit: null } })
  );
  await expect
    .element(ring(t.day.replace("{used}", "3").replace("{limit}", "300")))
    .toBeVisible();
  await expect
    .element(ring(t.month.replace("{used}", "40").replace("{limit}", "3000")))
    .toBeVisible();
});

it("shows the month as having no limit when neither the provider nor the row has one", async () => {
  await renderUsage(providerWith({ monthlyLimit: null }));
  await expect.element(ring(t.monthNone.replace("{used}", "40"))).toBeVisible();
});

it("draws both rings empty and says so in a toast when the provider cannot report", async () => {
  await renderUsage(providerWith({ usage: null }));
  await expect
    .element(ring(t.day.replace("{used}", "0").replace("{limit}", "100")))
    .toBeVisible();
  await expect
    .element(ring(t.month.replace("{used}", "0").replace("{limit}", "3000")))
    .toBeVisible();
  await expect
    .poll(() => aofToast)
    .toHaveBeenCalledWith(
      EN.Services.usage.unread.replace("{name}", "Provider 1"),
      "error"
    );
  expect(aofToast).toHaveBeenCalledTimes(1);
});
