// @module-tag integration

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { ServiceType } from "@allonfire/database/enums";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QUERY } from "@/shared/constants/query";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { setServiceEnabled } from "../../actions/services";
import { ServiceSwitch } from "../service-switch";

vi.mock("../../actions/services", () => ({ setServiceEnabled: vi.fn() }));
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const t = EN.Services.serviceEnabled;
const queryClient = new QueryClient();
const renderSwitch = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={aofMessages("en", EN)}
      >
        <ServiceSwitch enabled type={ServiceType.MAIL} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
/** A Gooey choice's option: a button, the chosen one `aria-current`. */
const choice = (name: string) =>
  page.getByRole("radiogroup", { name: t.label }).getByRole("button", { name });

beforeEach(() => {
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
  vi.mocked(setServiceEnabled).mockReset();
  vi.mocked(aofToast).mockReset();
});

it("turns the Service off as soon as Off is chosen", async () => {
  vi.mocked(setServiceEnabled).mockResolvedValue(true);
  await renderSwitch();
  await choice(t.off).click();
  await expect
    .poll(() => setServiceEnabled)
    .toHaveBeenCalledWith(ServiceType.MAIL, false);
  await expect.element(choice(t.off)).toHaveAttribute("aria-current", "page");
  expect(aofToast).not.toHaveBeenCalled();
});

it("refreshes the Services on screen once the Service is saved", async () => {
  vi.mocked(setServiceEnabled).mockResolvedValue(true);
  await renderSwitch();
  await choice(t.off).click();
  await expect
    .poll(() => queryClient.invalidateQueries)
    .toHaveBeenCalledWith({ queryKey: QUERY.SERVICES.ALL });
});

it("sends nothing when the option already shown is chosen again", async () => {
  vi.mocked(setServiceEnabled).mockResolvedValue(true);
  await renderSwitch();
  await choice(t.on).click();
  await choice(t.on).click();
  expect(setServiceEnabled).not.toHaveBeenCalled();
});

it.each([
  ["refused", () => Promise.resolve(false)],
  ["unreachable", () => Promise.reject(new Error("fetch failed"))],
])(
  "puts the confirmed choice back and says so when the save is %s",
  async (_, answer) => {
    vi.mocked(setServiceEnabled).mockImplementation(answer);
    await renderSwitch();
    await choice(t.off).click();
    await expect.element(choice(t.on)).toHaveAttribute("aria-current", "page");
    expect(aofToast).toHaveBeenCalledWith(t.failed, "error");
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  }
);
