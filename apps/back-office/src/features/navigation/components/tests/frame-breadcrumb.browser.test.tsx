// @module-tag integration

import { LOCAL } from "@allonfire/config/local/addresses";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { App } from "@allonfire/database/enums";
import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { NAVIGATION } from "@allonfire/ui/features/navigation/constants/navigation";
import { sectionHref } from "@allonfire/ui/features/navigation/utils/sections";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { cdp, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SECTION, SECTIONS } from "../../constants/sections";
import { AppFrame } from "../app-frame";

const t = EN.Navigation;
const common = SHARED_TRANSLATIONS.en.Common.Navigation;

/** The address the mocked router reports; a test moves it to navigate. */
const at = { pathname: sectionHref(SECTION.USERS.path) };

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  async () => ({
    aofBaseNavigation: {
      Link: (await import("@allonfire/ui/shared/tests/link-mock")).LinkMock,
      usePathname: () => at.pathname,
    },
  })
);

// The account menu and the switcher read the Session behind their own
// Suspense; the breadcrumb is what this test is about.
vi.mock("@allonfire/ui/features/navigation/components/aof-account", () => ({
  AOFAccount: () => <span>Account</span>,
  AOFAccountPlaceholder: () => <span>Account</span>,
}));
vi.mock(
  "@allonfire/ui/features/navigation/components/aof-app-switcher",
  () => ({
    AOFAppSwitcher: () => <span>Apps</span>,
    AOFCurrentApp: () => <span>Apps</span>,
  })
);

/** Following a link would reload the test's own page: links stay put. */
const stayPut = (event: MouseEvent) => event.preventDefault();

const ACCOUNT = "Account";
const PAGE = "Page";

const frame = (search = "", content: ReactNode = <p>{PAGE}</p>) => (
  <NuqsTestingAdapter searchParams={search}>
    <NextIntlClientProvider locale="en" messages={aofMessages("en", EN)}>
      <AppFrame addresses={{ [App.LAURA]: LOCAL.URL.LAURA }}>
        {content}
      </AppFrame>
    </NextIntlClientProvider>
  </NuqsTestingAdapter>
);

const breadcrumb = () =>
  page.getByRole("navigation", { exact: true, name: common.breadcrumb });

/** The words of the crumb marked as the current page. */
const currentCrumb = () =>
  breadcrumb().element().querySelector('[aria-current="page"]')?.textContent;

afterEach(() => document.removeEventListener("click", stayPut));

beforeEach(() => {
  document.addEventListener("click", stayPut);
  at.pathname = sectionHref(SECTION.USERS.path);
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("FrameBreadcrumb", () => {
  it("shows the App then the Section", async () => {
    await render(frame());
    await expect
      .element(breadcrumb().getByRole("link", { name: BACK_OFFICE.name }))
      .toBeVisible();
    await expect.poll(currentCrumb).toContain(t.users);
  });

  it("links the Section from a page under it, back to the Section", async () => {
    at.pathname = `${sectionHref(SECTION.USERS.path)}/new`;
    await render(frame());
    await expect
      .element(breadcrumb().getByRole("link", { name: t.users }))
      .toHaveAttribute("href", sectionHref(SECTION.USERS.path));
  });

  it("shows one crumb on Home", async () => {
    at.pathname = sectionHref(SECTION.HOME.path);
    await render(frame());
    await expect.poll(currentCrumb).toContain(t.home);
    // shadcn draws the current crumb as a disabled link: look for the App.
    await expect
      .element(breadcrumb().getByText(BACK_OFFICE.name))
      .not.toBeInTheDocument();
  });
});

describe("FrameBreadcrumb, in a narrow header", () => {
  // Little room for the trail (a small phone, or a tablet with the sidebar
  // open): the crumbs must stay on one line, the text cut short, never wrap
  // under the header or run out of it.
  it.each([[260], [300], [768]])(
    "keeps the trail on one line, inside its header, at %s wide",
    async (width) => {
      at.pathname = sectionHref(BACK_OFFICE.PAGE.STORAGE_IMAGES);
      await page.viewport(width, SCREEN.VIEWPORT.DESKTOP.HEIGHT);
      await render(frame());
      const list = breadcrumb().element().querySelector("ol");
      const crumbs = [...(list?.children ?? [])].filter(
        (item) => item.getClientRects().length > 0
      );
      expect(crumbs.length).toBeGreaterThan(1);
      const tops = crumbs.map((item) =>
        Math.round(item.getBoundingClientRect().top)
      );
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(
        crumbs[0]?.getBoundingClientRect().height ?? 0
      );
      const nav = breadcrumb().element().getBoundingClientRect();
      const header = breadcrumb().element().closest("header");
      expect(nav.right).toBeLessThanOrEqual(
        (header?.getBoundingClientRect().right ?? 0) + 1
      );
    }
  );
});

describe("AppFrame", () => {
  it("keeps every Section reachable while collapsed", async () => {
    await render(
      frame(
        `?${new URLSearchParams({ [NAVIGATION.PARAM.SIDEBAR]: String(false) })}`
      )
    );
    const menu = page.getByRole("navigation", { name: common.menu });
    await Promise.all(
      SECTIONS.map(({ label }) =>
        expect
          .element(menu.getByRole("link", { name: t[label] }))
          .toBeInTheDocument()
      )
    );
  });

  it("names the phone drawer and says when it is open", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const screen = await render(frame());
    const toggle = screen.getByRole("button", { name: common.toggleMenu });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
    // The drawer is modal: once open, the page behind it, the button
    // included, leaves the accessibility tree, so hold the button itself.
    const button = toggle.element();
    await toggle.click();
    await expect
      .element(page.getByRole("dialog", { exact: true, name: common.menu }))
      .toBeVisible();
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("says whether the desktop sidebar is expanded", async () => {
    await render(frame());
    const toggle = page.getByRole("button", { name: common.toggleMenu });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the phone drawer on navigation", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const screen = await render(frame());
    await screen.getByRole("button", { name: common.toggleMenu }).click();
    await expect.element(page.getByRole("dialog")).toBeVisible();
    at.pathname = sectionHref(SECTION.STORAGE.path);
    await screen.rerender(frame());
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the phone drawer when the Section you are on is tapped", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const screen = await render(frame());
    await screen.getByRole("button", { name: common.toggleMenu }).click();
    // The keyboard, not a pointer: without the App's styles Base UI's
    // backdrop lies over the drawer here.
    page
      .getByRole("dialog")
      .getByRole("link", { name: t.users })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });
});

/** A phone's notch and home indicator, larger than the gutters they meet. */
const NOTCH = { bottom: 34, left: 47, right: 47, top: 47 } as const;

/** Draws the screen with `insets` (`env(safe-area-inset-*)`), as a notched
 *  phone does; `{}` takes them away. Only Chromium can. */
const notch = (insets: Partial<typeof NOTCH>) =>
  cdp().send("Emulation.setSafeAreaInsetsOverride", { insets });

const px = (
  element: Element | null | undefined,
  side: "Bottom" | "Left" | "Right" | "Top"
) => {
  if (!element) {
    throw new Error("the frame's part is missing");
  }
  return Number.parseFloat(getComputedStyle(element)[`padding${side}`]);
};

// WebKit has no way to draw a notch.
describe.runIf(server.browser === "chromium")(
  "AppFrame on a notched screen",
  () => {
    afterEach(() => notch({}));

    /** The sidebar's footer: what holds the account menu. */
    const footer = () =>
      page
        .getByText(ACCOUNT, { exact: true })
        .element()
        .closest('[data-slot="sidebar-footer"]');

    it("keeps the account menu above the home indicator beside the page", async () => {
      await render(frame());
      await notch(NOTCH);
      expect(px(footer(), "Bottom")).toBe(NOTCH.bottom);
    });

    it("keeps the account menu above the home indicator in the phone's drawer", async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE.WIDTH,
        SCREEN.VIEWPORT.PHONE.HEIGHT
      );
      const screen = await render(frame());
      await notch(NOTCH);
      await screen.getByRole("button", { name: common.toggleMenu }).click();
      await expect.element(page.getByRole("dialog")).toBeVisible();
      expect(px(footer(), "Bottom")).toBe(NOTCH.bottom);
    });

    it("keeps the header's right end clear of a notch on that side", async () => {
      const screen = await render(frame());
      const header = screen
        .getByRole("button", { name: common.toggleMenu })
        .element()
        .closest("header");
      const clear = px(header, "Right");
      await notch(NOTCH);
      expect(px(header, "Right")).toBe(clear + NOTCH.right);
    });

    /** The page's header, the frame's top bar. */
    const header = () =>
      page
        .getByRole("button", { name: common.toggleMenu })
        .element()
        .closest("header");
    /** The sidebar's header: the App switcher's band. */
    const sidebarHeader = () =>
      page
        .getByText("Apps", { exact: true })
        .element()
        .closest('[data-slot="sidebar-header"]');
    const height = (element: Element | null) =>
      element?.getBoundingClientRect().height;

    it("keeps the header's menu button clear of a notch on the left with no sidebar beside it", async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE.WIDTH,
        SCREEN.VIEWPORT.PHONE.HEIGHT
      );
      await render(frame());
      const clear = px(header(), "Left");
      await notch(NOTCH);
      expect(px(header(), "Left")).toBe(clear + NOTCH.left);
    });

    it("leaves the left notch to the sidebar beside the header", async () => {
      await render(frame());
      const clear = px(header(), "Left");
      await notch(NOTCH);
      expect(px(header(), "Left")).toBe(clear);
    });

    it("keeps both top bars below a notch above, their lines level", async () => {
      await render(frame());
      const clear = height(header());
      await notch(NOTCH);
      expect(px(header(), "Top")).toBe(NOTCH.top);
      expect(px(sidebarHeader(), "Top")).toBe(NOTCH.top);
      // The bar grows by the notch: its row keeps its own height.
      expect(height(header())).toBe((clear ?? 0) + NOTCH.top);
      expect(height(sidebarHeader())).toBe(height(header()));
    });

    it("drops the left notch from the page's gutter beside the sidebar, which clears it", async () => {
      const section = () =>
        page.getByText(PAGE, { exact: true }).element().closest("section");
      await render(frame("", <AOFSectionPage>{PAGE}</AOFSectionPage>));
      const clear = px(section(), "Left");
      await notch(NOTCH);
      expect(px(section(), "Left")).toBe(clear);
      // A phone's page meets the left edge: it keeps the notch out.
      await page.viewport(
        SCREEN.VIEWPORT.PHONE.WIDTH,
        SCREEN.VIEWPORT.PHONE.HEIGHT
      );
      expect(px(section(), "Left")).toBe(NOTCH.left);
    });
  }
);
