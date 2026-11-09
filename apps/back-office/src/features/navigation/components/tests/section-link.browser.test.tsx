// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import {
  AOFSidebar,
  AOFSidebarMenu,
  AOFSidebarMenuItem,
  AOFSidebarProvider,
} from "@allonfire/ui/features/navigation/components/aof-sidebar";
import { IconMail, IconServerCog } from "@tabler/icons-react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SidebarSectionLink } from "../section-link";

const t = EN.Navigation;

/** The address the sub-menu is rendered at. */
const at = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("@/features/i18n/navigation", async () => ({
  Link: (await import("@/shared/tests/link-mock")).LinkMock,
  usePathname: () => at.pathname,
}));

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

const services = () => (
  <AOFSidebarProvider>
    <AOFSidebar label={t.menu}>
      <AOFSidebarMenu>
        <AOFSidebarMenuItem>
          <SidebarSectionLink
            label={t.services}
            pages={[
              {
                icon: <IconMail aria-hidden />,
                label: t.mail,
                path: BACK_OFFICE.PAGE.SERVICES_MAIL,
              },
            ]}
            path={BACK_OFFICE.PAGE.SERVICES}
          >
            <IconServerCog aria-hidden />
          </SidebarSectionLink>
        </AOFSidebarMenuItem>
      </AOFSidebarMenu>
    </AOFSidebar>
  </AOFSidebarProvider>
);

const renderServices = (pathname: string) => {
  at.pathname = pathname;
  return render(services());
};

describe("SidebarSectionLink with pages", () => {
  it("opens and closes the sub-menu from the whole row", async () => {
    const screen = await renderServices("/");
    const row = screen.getByRole("button", { name: t.services });
    await expect.element(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect.element(row).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByRole("link", { name: t.mail }))
      .toBeVisible();
    await row.click();
    await expect.element(row).toHaveAttribute("aria-expanded", "false");
  });

  it("starts open on one of its pages, marking that page and never the row", async () => {
    const screen = await renderServices(BACK_OFFICE.PAGE.SERVICES_MAIL);
    const row = screen.getByRole("button", { name: t.services });
    await expect.element(row).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByRole("link", { name: t.mail }))
      .toHaveAttribute("aria-current", "page");
    expect(row.element().getAttribute("aria-current")).toBeNull();
    expect(row.element().hasAttribute("data-active")).toBe(false);
  });

  it("opens when you arrive on one of its pages", async () => {
    const screen = await renderServices("/");
    const row = screen.getByRole("button", { name: t.services });
    await expect.element(row).toHaveAttribute("aria-expanded", "false");
    at.pathname = BACK_OFFICE.PAGE.SERVICES_MAIL;
    await screen.rerender(services());
    await expect.element(row).toHaveAttribute("aria-expanded", "true");
  });
});
