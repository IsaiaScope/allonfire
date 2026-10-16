// @module-tag integration
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
const ITALIAN = "it";

const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="en" messages={EN}>
      <AccountMenu
        labels={{
          account: t.account,
          language: t.language,
          signOut: t.signOut,
          theme: t.theme,
        }}
        name={NAME}
        role={t.role.ADMIN}
      />
    </NextIntlClientProvider>
  );

describe("AccountMenu", () => {
  it("opens from the keyboard and shows who is signed in", async () => {
    await renderMenu();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByRole("menu")).toBeVisible();
    await expect.element(page.getByText(t.role.ADMIN)).toBeVisible();
  });

  it("links each language to the same Section", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    await expect
      .element(
        page.getByRole("menuitem", {
          exact: true,
          name: ITALIAN.toUpperCase(),
        })
      )
      .toHaveAttribute("href", `/${ITALIAN}${SECTION.USERS.path}`);
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
