// @module-tag integration
import { LOCAL } from "@allonfire/config/local/addresses";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { App } from "@allonfire/database/enums";
import { IconLibraryPhoto } from "@tabler/icons-react";
import { page, userEvent } from "vitest/browser";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import { AOFAppSwitcherMenu } from "../components/aof-app-switcher-menu";
import { AOFSidebarProvider } from "../components/aof-sidebar";
import type { AppSwitcherDescriptor } from "../types/app-descriptor";
import { type SwitcherEntry, switcherApps } from "../utils/switcher-apps";

vi.mock("../../../shared/components/aof-image", async () => ({
  AOFImage: (await import("../../../shared/tests/image-mock")).ImageMock,
}));

const t = SHARED_TRANSLATIONS.en.Common.Navigation;
const HERE = "Office";
const LAURA = "Her App";
/** The App you are in, as far as the switcher reads it. */
const APP = {
  app: App.BACK_OFFICE,
  entries: {
    [App.BACK_OFFICE]: { mark: { icon: IconLibraryPhoto }, name: HERE },
    [App.LAURA]: { mark: { icon: IconLibraryPhoto }, name: LAURA },
  },
  name: HERE,
} as const satisfies AppSwitcherDescriptor;
const OTHERS = switcherApps(APP, [App.BACK_OFFICE, App.LAURA], {
  [App.LAURA]: LOCAL.URL.LAURA,
});

const renderSwitcher = (apps: SwitcherEntry[]) =>
  renderInUi({
    children: (
      <AOFSidebarProvider>
        <AOFAppSwitcherMenu app={APP} apps={apps} labels={t} />
      </AOFSidebarProvider>
    ),
    messages: {},
  });

const openFromKeyboard = async () => {
  await userEvent.keyboard("{Tab}");
  await userEvent.keyboard("{Enter}");
};

/** What the switcher's button shows: the App you are in. */
const SHOWN = new RegExp(HERE);

describe("AOFAppSwitcherMenu", () => {
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
