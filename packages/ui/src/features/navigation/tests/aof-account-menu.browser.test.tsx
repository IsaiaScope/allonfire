// @module-tag integration
import { USER } from "@allonfire/auth/features/users/constants/users";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { languageName } from "@allonfire/core/features/i18n/utils/language-name";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import type { ReactNode } from "react";
import { page, userEvent } from "vitest/browser";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import { AOFAccountMenu } from "../components/aof-account-menu";
import { AOFSidebarProvider } from "../components/aof-sidebar";
import { NAVIGATION } from "../constants/navigation";

/** The page's query, which every language link keeps. */
const QUERY = `${USER.PARAM.SEARCH}=isa`;

/** The page the menu opens on: a Section, with the query above. */
const SECTION_PATH = "/users";

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@allonfire/core/features/next/i18n/utils/aof-base-navigation")
      >();
    return {
      aofBaseNavigation: {
        ...original.aofBaseNavigation,
        usePathname: () => SECTION_PATH,
      },
    };
  }
);

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(QUERY),
}));

const t = SHARED_TRANSLATIONS.en.Common.Navigation;
const NAME = "Someone";
const EMAIL = "someone@example.test";
const SHOWN_NAME = new RegExp(NAME);
const ITALIAN = "it";

const renderMenu = (seal?: ReactNode) =>
  renderInUi({
    children: (
      <AOFSidebarProvider>
        <AOFAccountMenu
          email={EMAIL}
          labels={{
            account: t.account,
            language: t.language,
            signOut: t.signOut,
            theme: t.theme,
            themeDark: t.themeDark,
            themeLight: t.themeLight,
          }}
          name={NAME}
          role={t.role.ADMIN}
          seal={seal}
        />
      </AOFSidebarProvider>
    ),
    messages: {},
  });

describe("AOFAccountMenu", () => {
  it("opens from the keyboard and shows who is signed in", async () => {
    const screen = await renderMenu();
    const trigger = screen.getByRole("button", { name: t.account });
    await expect.element(trigger).toHaveTextContent(NAME);
    await expect.element(trigger).toHaveTextContent(EMAIL);
    // Voice control: the button answers to what it shows (WCAG 2.5.3).
    await expect.element(trigger).toHaveAccessibleName(SHOWN_NAME);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const menu = page.getByRole("menu");
    await expect.element(menu).toBeVisible();
    await expect.element(menu).toHaveTextContent(EMAIL);
    await expect.element(menu.getByText(t.role.ADMIN)).toBeVisible();
  });

  it("presses the App's seal for the Role beside the User, and none without one", async () => {
    const withSeal = await renderMenu(<span>SEAL</span>);
    await withSeal.getByRole("button", { name: t.account }).click();
    await expect.element(page.getByRole("menu")).toHaveTextContent("SEAL");
    await userEvent.keyboard("{Escape}");
    await withSeal.unmount();
    const without = await renderMenu();
    await without.getByRole("button", { name: t.account }).click();
    await expect.element(page.getByRole("menu")).not.toHaveTextContent("SEAL");
  });

  it("links each language to the same Section and query, the current one checked", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    // Each named in its own language, not read out as two letters.
    const italian = page.getByRole("menuitemradio", {
      exact: true,
      name: languageName(ITALIAN),
    });
    await expect
      .element(italian)
      .toHaveAttribute("href", `/${ITALIAN}${SECTION_PATH}?${QUERY}`);
    await expect.element(italian).not.toBeChecked();
    await expect
      .element(
        page.getByRole("menuitemradio", {
          exact: true,
          name: languageName(I18N.DEFAULT_LANGUAGE),
        })
      )
      .toBeChecked();
  });

  it("names each choice in a tooltip under the pointer", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    await page
      .getByRole("group", { name: t.theme })
      .getByRole("menuitemradio", { name: t.themeDark })
      .hover();
    // Base UI's tooltip popup carries no role: find it by its words.
    await expect
      .element(page.getByText(t.themeDark, { exact: true }))
      .toBeVisible();
  });

  it("offers light and dark as one choice", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    const group = page.getByRole("group", { name: t.theme });
    await expect
      .element(group.getByRole("menuitemradio", { name: t.themeLight }))
      .toBeVisible();
    await expect
      .element(group.getByRole("menuitemradio", { name: t.themeDark }))
      .toBeVisible();
  });

  it("closes on Escape and gives focus back to its button", async () => {
    const screen = await renderMenu();
    const trigger = screen.getByRole("button", { name: t.account });
    await trigger.click();
    await expect.element(page.getByRole("menu")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it("signs out through the page's own form", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    await expect
      .element(page.getByRole("menuitem", { name: t.signOut }))
      .toHaveAttribute("form", NAVIGATION.FORM.SIGN_OUT);
  });
});
