// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { ServiceType } from "@allonfire/database/enums";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { renderWithServices, SERVICES } from "../../tests/render-services";
import { ServiceProviders } from "../service-providers";
import { ServicesSkeleton } from "../services-skeleton";

vi.mock("../../actions/services", () => ({
  saveProvider: vi.fn(),
  sendTestEmail: vi.fn(),
  setServiceEnabled: vi.fn(),
}));

/** As wide as the form's page beside the sidebar, where the fields pair up. */
const WIDE_PX = 800;
/** As narrow as a phone's page, where they stack. */
const NARROW_PX = 360;

const title = <h1 className="font-bold text-2xl">Mail</h1>;

/** The Services page's body, `width` wide, as `view` draws it. */
const renderAt = async (width: number, view: ReactNode) => {
  const screen = await renderWithServices(
    SERVICES,
    <div style={{ width }}>{view}</div>
  );
  return screen.container.firstElementChild?.getBoundingClientRect().height;
};

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("ServicesSkeleton", () => {
  it.each([
    ["a wide page", WIDE_PX],
    ["a phone", NARROW_PX],
  ])(
    "is as tall as the page it stands in for on %s, so nothing moves when the providers arrive",
    async (_, width) => {
      const real = await renderAt(
        width,
        <ServiceProviders title={title} type={ServiceType.MAIL} />
      );
      await expect.element(page.getByText("Provider One")).toBeVisible();
      const skeleton = await renderAt(
        width,
        <ServicesSkeleton title={title} />
      );
      expect(skeleton).toBeCloseTo(real ?? 0, 0);
    }
  );
});
