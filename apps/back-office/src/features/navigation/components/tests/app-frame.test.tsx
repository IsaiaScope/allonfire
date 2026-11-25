// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { App } from "@allonfire/database/enums";
import { sectionEntry } from "@allonfire/ui/features/navigation/utils/sections";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SECTION } from "../../constants/sections";
import { AppFrame } from "../app-frame";

// The frame's gated rows read the Session; the Back Office has none gated.
vi.mock("@allonfire/auth/features/next/utils/session", () => ({
  requireAppSession: vi.fn(),
}));
// The account menu and the switcher read the Session behind their own
// Suspense; the frame's own markup is what this test is about.
vi.mock("@allonfire/ui/features/navigation/components/aof-account", () => ({
  AOFAccount: () => null,
  AOFAccountPlaceholder: () => null,
}));
vi.mock(
  "@allonfire/ui/features/navigation/components/aof-app-switcher",
  () => ({ AOFAppSwitcher: () => null, AOFCurrentApp: () => null })
);
// The Role rule reads the App auth serves, which a test has no env for.
vi.mock("@allonfire/auth/environment/next-environment", async () => ({
  nextAuthEnv: {
    AUTH_APP: (await import("@allonfire/database/enums")).App.BACK_OFFICE,
  },
}));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  async () => ({
    aofBaseNavigation: {
      Link: (await import("@allonfire/ui/shared/tests/link-mock")).LinkMock,
      usePathname: () => "/",
    },
  })
);

const renderFrame = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={aofMessages("en", EN)}>
      <AppFrame addresses={{ [App.LAURA]: LOCAL.URL.LAURA }}>
        <p>Page</p>
      </AppFrame>
    </NextIntlClientProvider>
  );

const count = (html: string, text: string) => html.split(text).length - 1;

// Its gutters on a notched screen: its browser test, beside the breadcrumb's.
describe("AppFrame", () => {
  it("names the menu and lists every Section once", () => {
    const html = renderFrame();
    expect(
      count(
        html,
        `aria-label="${SHARED_TRANSLATIONS.en.Common.Navigation.menu}"`
      )
    ).toBe(1);
    // A Section with its own pages is reached through the first.
    for (const section of SECTION.LIST) {
      expect(
        count(html, `href="${sectionEntry(section)}"`)
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("has the menu button and the breadcrumb", () => {
    const html = renderFrame();
    expect(html).toContain(
      `aria-label="${SHARED_TRANSLATIONS.en.Common.Navigation.toggleMenu}"`
    );
    expect(html).toContain('data-slot="breadcrumb"');
  });

  it("marks Home current on the root, and only Home", () => {
    expect(renderFrame().match(/<a[^>]*aria-current="page"/g)).toHaveLength(1);
  });
});
