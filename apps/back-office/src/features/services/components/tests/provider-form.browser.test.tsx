// @module-tag integration

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QUERY } from "@/shared/constants/query";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { saveProvider } from "../../actions/services";
import { SERVICES } from "../../constants/services";
import type { ListedProvider } from "../../utils/services-queries";
import { ProviderForm } from "../provider-form";

vi.mock("../../actions/services", () => ({ saveProvider: vi.fn() }));

const t = EN.Services;
const PROVIDER: ListedProvider = {
  configured: true,
  dailyLimit: 100,
  enabled: true,
  fromAddress: "no-reply@form.test",
  id: "provider-0",
  lastAcceptedAt: null,
  monthlyLimit: 3000,
  name: "Provider One",
  slot: 0,
  usage: null,
  version: "v-1",
};

const queryClient = new QueryClient();
const renderForm = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={aofMessages("en", EN)}
      >
        <ProviderForm provider={PROVIDER} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
const save = () => page.getByRole("button", { name: t.save });

beforeEach(() => {
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
  vi.mocked(saveProvider).mockReset();
});

it("refreshes the Services on screen once the provider is saved", async () => {
  vi.mocked(saveProvider).mockResolvedValue({
    opened: PROVIDER.version,
    version: "v-2",
  });
  await renderForm();
  await save().click();
  await expect
    .poll(() => queryClient.invalidateQueries)
    .toHaveBeenCalledWith({ queryKey: QUERY.SERVICES.ALL });
});

it.each([SERVICES.SAVE_ERROR.CHANGED, SERVICES.SAVE_ERROR.REMOVED])(
  "refreshes the Services on screen when the save is refused as %s, since the copy is old",
  async (error) => {
    vi.mocked(saveProvider).mockResolvedValue({
      error,
      opened: PROVIDER.version,
    });
    await renderForm();
    await save().click();
    await expect
      .poll(() => queryClient.invalidateQueries)
      .toHaveBeenCalledWith({ queryKey: QUERY.SERVICES.ALL });
  }
);

it("leaves the Services as they are when the save is refused for its own values", async () => {
  vi.mocked(saveProvider).mockResolvedValue({
    error: SERVICES.SAVE_ERROR.INVALID,
    opened: PROVIDER.version,
  });
  await renderForm();
  await save().click();
  await expect.element(page.getByText(t.error.invalid)).toBeVisible();
  expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
});
