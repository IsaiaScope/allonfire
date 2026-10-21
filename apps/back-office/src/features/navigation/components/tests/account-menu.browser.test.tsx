// @module-tag integration
import { AOFSidebarProvider } from "@allonfire/ui/components/aof-sidebar";
import { NextIntlClientProvider } from "next-intl";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { NAVIGATION } from "../../constants/navigation";
import { SECTION } from "../../constants/sections";
import { AccountMenu } from "../account-menu";

vi.mock("@/features/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/i18n/navigation")>()),
  usePathname: () => SECTION.USERS.path,
}));

const t = EN.Navigation;
const NAME = "Someone";
const EMAIL = "someone@example.test";
const SHOWN_NAME = new RegExp(NAME);
const ITALIAN = "it";

const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="en" messages={EN}>
      <AOFSidebarProvider>
        <AccountMenu
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
          seal={NAVIGATION.ROLE_SEAL.ADMIN}
        />
      </AOFSidebarProvider>
    </NextIntlClientProvider>
  );

describe("AccountMenu", () => {
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

  it("links each language to the same Section, the current one checked", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    const italian = page.getByRole("menuitemradio", {
      exact: true,
      name: ITALIAN.toUpperCase(),
    });
    await expect
      .element(italian)
      .toHaveAttribute("href", `/${ITALIAN}${SECTION.USERS.path}`);
    await expect.element(italian).not.toBeChecked();
    await expect
      .element(page.getByRole("menuitemradio", { exact: true, name: "EN" }))
      .toBeChecked();
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
