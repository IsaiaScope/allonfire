// @module-tag integration

import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { worker } from "@allonfire/config/tests/browser/msw";
import { ServiceType } from "@allonfire/database/enums";
import { http } from "msw";
import { page } from "vitest/browser";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { renderWithServices, SERVICES } from "../../tests/render-services";
import type { ServiceList } from "../../utils/services-queries";
import { ServiceProviders } from "../service-providers";

vi.mock("../../actions/services", () => ({
  saveProvider: vi.fn(),
  sendTestEmail: vi.fn(),
  setServiceEnabled: vi.fn(),
}));

const t = EN.Services;
const renderView = (services: ServiceList) =>
  renderWithServices(
    services,
    <ServiceProviders title={<h1>Mail</h1>} type={ServiceType.MAIL} />
  );

it("draws the providers it was handed, without asking the API", async () => {
  await renderView(SERVICES);
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

it("draws the Service's skeleton, not the Section's waiting room, while the providers are read", async () => {
  worker.use(
    http.get(
      `${LOCAL.URL.TEST_API}${API.PATH.SERVICES}`,
      () => new Promise(() => undefined)
    )
  );
  renderWithServices(
    undefined,
    <ServiceProviders title={<h1>Mail</h1>} type={ServiceType.MAIL} />
  );
  await expect.element(page.getByRole("status")).toHaveTextContent(t.loading);
  expect(document.querySelector('[data-skeleton="card"]')).not.toBeNull();
});
