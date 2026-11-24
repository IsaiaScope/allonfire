// @module-tag integration

import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import {
  IconCards,
  IconMail,
  IconServerCog,
  IconTrophy,
} from "@tabler/icons-react";
import { page } from "vitest/browser";
import { navigationAt } from "../../../shared/tests/navigation-mock";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import {
  AOFSidebar,
  AOFSidebarMenu,
  AOFSidebarMenuItem,
  AOFSidebarProvider,
} from "../components/aof-sidebar";
import { AOFSidebarSectionLink } from "../components/aof-sidebar-section-link";

/** An App's own words for a Section and its page, and their paths. */
const t = {
  leaderboard: "Leaderboard",
  mail: "Mail",
  memory: "Memory",
  play: "Play",
  services: "Services",
};
const PATH = {
  LEADERBOARD: "/memory/leaderboard",
  MEMORY: "/memory",
  SERVICES: "/services",
  SERVICES_MAIL: "/services/mail",
};
const ROW = { current: "CUR", idle: "IDLE" };
const common = SHARED_TRANSLATIONS.en.Common.Navigation;

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

const services = () => (
  <AOFSidebarProvider>
    <AOFSidebar label={common.menu}>
      <AOFSidebarMenu>
        <AOFSidebarMenuItem>
          <AOFSidebarSectionLink
            label={t.services}
            pages={[
              {
                icon: <IconMail aria-hidden />,
                label: t.mail,
                path: PATH.SERVICES_MAIL,
              },
            ]}
            path={PATH.SERVICES}
            rowClassName={ROW}
          >
            <IconServerCog aria-hidden />
          </AOFSidebarSectionLink>
        </AOFSidebarMenuItem>
      </AOFSidebarMenu>
    </AOFSidebar>
  </AOFSidebarProvider>
);

const renderServices = (pathname: string) => {
  navigationAt.pathname = pathname;
  return renderInUi({ children: services(), messages: {} });
};

describe("AOFSidebarSectionLink with pages", () => {
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
    const screen = await renderServices(PATH.SERVICES_MAIL);
    const row = screen.getByRole("button", { name: t.services });
    await expect.element(row).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByRole("link", { name: t.mail }))
      .toHaveAttribute("aria-current", "page");
    expect(row.element().getAttribute("aria-current")).toBeNull();
    expect(row.element().hasAttribute("data-active")).toBe(false);
  });

  it("dresses the page you are on with the current class, and every other row with the idle one", async () => {
    const screen = await renderServices(PATH.SERVICES_MAIL);
    const mail = screen.getByRole("link", { name: t.mail }).element();
    expect(mail.classList.contains(ROW.current)).toBe(true);
    expect(mail.classList.contains(ROW.idle)).toBe(false);
    const row = screen.getByRole("button", { name: t.services }).element();
    expect(row.classList.contains(ROW.idle)).toBe(true);
    expect(row.classList.contains(ROW.current)).toBe(false);
  });

  it("opens when you arrive on one of its pages", async () => {
    const screen = await renderServices("/");
    const row = screen.getByRole("button", { name: t.services });
    await expect.element(row).toHaveAttribute("aria-expanded", "false");
    navigationAt.pathname = PATH.SERVICES_MAIL;
    await screen.rerender(services());
    await expect.element(row).toHaveAttribute("aria-expanded", "true");
  });
});

/** A Section whose first page is the Section's own path, the other under it. */
const memory = () => (
  <AOFSidebarProvider>
    <AOFSidebar label={common.menu}>
      <AOFSidebarMenu>
        <AOFSidebarMenuItem>
          <AOFSidebarSectionLink
            label={t.memory}
            pages={[
              {
                icon: <IconCards aria-hidden />,
                label: t.play,
                path: PATH.MEMORY,
              },
              {
                icon: <IconTrophy aria-hidden />,
                label: t.leaderboard,
                path: PATH.LEADERBOARD,
              },
            ]}
            path={PATH.MEMORY}
            rowClassName={ROW}
          >
            <IconCards aria-hidden />
          </AOFSidebarSectionLink>
        </AOFSidebarMenuItem>
      </AOFSidebarMenu>
    </AOFSidebar>
  </AOFSidebarProvider>
);

describe("AOFSidebarSectionLink whose pages sit under one another", () => {
  it("marks only the longest page's link: Leaderboard, never Play too", async () => {
    navigationAt.pathname = PATH.LEADERBOARD;
    const screen = await renderInUi({ children: memory(), messages: {} });
    await expect
      .element(screen.getByRole("link", { name: t.leaderboard }))
      .toHaveAttribute("aria-current", "page");
    expect(
      screen
        .getByRole("link", { name: t.play })
        .element()
        .getAttribute("aria-current")
    ).toBeNull();
  });

  it("marks Play on the Section's own path", async () => {
    navigationAt.pathname = PATH.MEMORY;
    const screen = await renderInUi({ children: memory(), messages: {} });
    await expect
      .element(screen.getByRole("link", { name: t.play }))
      .toHaveAttribute("aria-current", "page");
    expect(
      screen
        .getByRole("link", { name: t.leaderboard })
        .element()
        .getAttribute("aria-current")
    ).toBeNull();
  });
});
