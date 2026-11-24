// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { App } from "@allonfire/database/enums";
import { IconLibraryPhoto } from "@tabler/icons-react";
import { createTranslator } from "next-intl";
import { AOFAppSwitcher, AOFCurrentApp } from "../components/aof-app-switcher";
import { AOFAppSwitcherMenu } from "../components/aof-app-switcher-menu";

const requireAppSession = vi.hoisted(() => vi.fn());

vi.mock("@allonfire/auth/features/next/utils/session", () => ({
  requireAppSession,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: "Common.Navigation") =>
    createTranslator({
      locale: "en",
      messages: SHARED_TRANSLATIONS.en,
      namespace,
    }),
}));

const APP = {
  app: App.BACK_OFFICE,
  entries: {
    [App.BACK_OFFICE]: { mark: { icon: IconLibraryPhoto }, name: "Office" },
    [App.LAURA]: { mark: { icon: IconLibraryPhoto }, name: "Her App" },
  },
  name: "Office",
} as const;

beforeEach(() => {
  requireAppSession.mockResolvedValue({
    user: {
      email: "someone@example.test",
      image: null,
      memberships: [
        { app: App.BACK_OFFICE, role: "ADMIN" },
        { app: App.LAURA, role: "ADMIN" },
      ],
      name: "Someone",
    },
  });
});

describe("AOFAppSwitcher", () => {
  it("opens nothing when no other App has an address: the App you are in alone", async () => {
    const switcher = await AOFAppSwitcher({ addresses: {}, app: APP });
    expect(switcher.type).toBe(AOFCurrentApp);
  });

  it("lists the other Apps the User is let into that have an address", async () => {
    const switcher = await AOFAppSwitcher({
      addresses: { [App.LAURA]: LOCAL.URL.LAURA },
      app: APP,
    });
    expect(switcher.type).toBe(AOFAppSwitcherMenu);
    expect(switcher.props.apps).toEqual([
      expect.objectContaining({ app: App.LAURA, name: "Her App" }),
    ]);
  });
});
