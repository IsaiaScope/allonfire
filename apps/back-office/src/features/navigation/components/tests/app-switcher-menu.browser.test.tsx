// @module-tag integration
import { LOCAL } from "@allonfire/config/local/addresses";
import { App } from "@allonfire/database/enums";
import { AOFSidebarProvider } from "@allonfire/ui/components/aof-sidebar";
import { NextIntlClientProvider } from "next-intl";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { type SwitcherApp, switcherApps } from "../../constants/apps";
import { AppSwitcherMenu } from "../app-switcher-menu";

// next/image reaches the browser as a CommonJS object, not a component.
vi.mock("@allonfire/ui/components/aof-image", () => ({
  AOFImage: ({ alt, src }: { alt: string; src: string }) => (
    <span data-alt={alt} data-src={src} />
  ),
}));

const t = EN.Navigation;
const OTHERS = switcherApps(
  [App.BACK_OFFICE, App.LAURA],
  { [App.LAURA]: LOCAL.URL.LAURA },
  App.BACK_OFFICE
);
const LAURA = APP_ENTRY[App.LAURA].name;

const renderSwitcher = (apps: SwitcherApp[]) =>
  render(
    <NextIntlClientProvider locale="en" messages={EN}>
      <AOFSidebarProvider>
        <AppSwitcherMenu
          apps={apps}
          labels={{ apps: t.apps, switchApp: t.switchApp }}
        />
      </AOFSidebarProvider>
    </NextIntlClientProvider>
  );

const openFromKeyboard = async () => {
  await userEvent.keyboard("{Tab}");
  await userEvent.keyboard("{Enter}");
};

/** What the switcher's button shows: the App you are in. */
const SHOWN = new RegExp(BACK_OFFICE.NAME);

describe("AppSwitcherMenu", () => {
  it("answers to the App it shows", async () => {
    const screen = await renderSwitcher(OTHERS);
    await expect
      .element(screen.getByRole("button", { name: t.switchApp }))
      .toHaveAccessibleName(SHOWN);
  });

  it("opens from the keyboard and links to the other Apps only", async () => {
    await renderSwitcher(OTHERS);
    await openFromKeyboard();
    const laura = page.getByRole("menuitem", { name: new RegExp(LAURA) });
    await expect.element(laura).toHaveAttribute("href", LOCAL.URL.LAURA);
    await expect
      .element(laura)
      .toHaveTextContent(new URL(LOCAL.URL.LAURA).host);
    await expect.element(page.getByRole("menuitem")).toHaveTextContent(LAURA);
  });
});
