// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { NAVIGATION } from "../../constants/navigation";
import { SECTION, SECTIONS, sectionHref } from "../../constants/sections";
import { AppFrame } from "../app-frame";

const t = EN.Navigation;

/** The address the mocked router reports; a test moves it to navigate. */
const at = { pathname: sectionHref(SECTION.USERS.path) };

vi.mock("@/features/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => at.pathname,
}));

/** Following a link would reload the test's own page: links stay put. */
const stayPut = (event: MouseEvent) => event.preventDefault();

const frame = (search = "") => (
  <NuqsTestingAdapter searchParams={search}>
    <NextIntlClientProvider locale="en" messages={EN}>
      <AppFrame account={<span>Account</span>} switcher={<span>Apps</span>}>
        <p>Page</p>
      </AppFrame>
    </NextIntlClientProvider>
  </NuqsTestingAdapter>
);

const breadcrumb = () =>
  page.getByRole("navigation", { exact: true, name: t.breadcrumb });

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
      .element(breadcrumb().getByRole("link", { name: BACK_OFFICE.NAME }))
      .toBeVisible();
    await expect
      .element(breadcrumb().getByText(t.users))
      .toHaveAttribute("aria-current", "page");
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
    await expect
      .element(breadcrumb().getByText(t.home))
      .toHaveAttribute("aria-current", "page");
    // shadcn draws the current crumb as a disabled link: look for the App.
    await expect
      .element(breadcrumb().getByText(BACK_OFFICE.NAME))
      .not.toBeInTheDocument();
  });
});

describe("AppFrame", () => {
  it("keeps every Section reachable while collapsed", async () => {
    await render(
      frame(
        `?${new URLSearchParams({ [NAVIGATION.PARAM.SIDEBAR]: String(false) })}`
      )
    );
    const menu = page.getByRole("navigation", { name: t.menu });
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
    const toggle = screen.getByRole("button", { name: t.toggleMenu });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
    // The drawer is modal: once open, the page behind it, the button
    // included, leaves the accessibility tree, so hold the button itself.
    const button = toggle.element();
    await toggle.click();
    await expect
      .element(page.getByRole("dialog", { exact: true, name: t.menu }))
      .toBeVisible();
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("says whether the desktop sidebar is expanded", async () => {
    await render(frame());
    const toggle = page.getByRole("button", { name: t.toggleMenu });
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
    await screen.getByRole("button", { name: t.toggleMenu }).click();
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
    await screen.getByRole("button", { name: t.toggleMenu }).click();
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
