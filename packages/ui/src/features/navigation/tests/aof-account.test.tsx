// @module-tag unit
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { App, Role } from "@allonfire/database/enums";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFAccount } from "../components/aof-account";

const requireAppSession = vi.hoisted(() => vi.fn());

vi.mock("@allonfire/auth/features/next/utils/session", () => ({
  requireAppSession,
}));
// The menu itself is not rendered here; its navigation needs a Next runtime.
vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-navigation", () => ({
  aofBaseNavigation: {},
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: "Common.Navigation") =>
    createTranslator({
      locale: "en",
      messages: SHARED_TRANSLATIONS.en,
      namespace,
    }),
}));

const signedInAs = (role: Role) =>
  requireAppSession.mockResolvedValue({
    user: {
      email: "someone@example.test",
      image: null,
      memberships: [{ app: App.BACK_OFFICE, role }],
      name: "Someone",
    },
  });
const VERSION = "7.8.9";
const APP = { app: App.BACK_OFFICE, version: VERSION };
const stamp = (role: Role) => <span>SEAL {role}</span>;

describe("AOFAccount", () => {
  it("hands the menu the App's seal for the Role the User holds", async () => {
    signedInAs(Role.ADMIN);
    const menu = await AOFAccount({ app: APP, seal: stamp });
    expect(renderToStaticMarkup(menu.props.seal)).toContain("SEAL ADMIN");
  });

  it("presses no seal when the App gives none", async () => {
    signedInAs(Role.ADMIN);
    const menu = await AOFAccount({ app: APP });
    expect(menu.props.seal).toBeUndefined();
  });

  it("names the Role the User holds in this App, in the shared words", async () => {
    signedInAs(Role.USER);
    const menu = await AOFAccount({ app: APP });
    expect(menu.props.role).toBe(
      SHARED_TRANSLATIONS.en.Common.Navigation.role.USER
    );
  });

  it("hands the menu the App's own version", async () => {
    signedInAs(Role.ADMIN);
    const menu = await AOFAccount({ app: APP });
    expect(menu.props.version).toBe(VERSION);
  });
});
