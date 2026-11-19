// @module-tag unit
// @vitest-environment node
import { LOCAL } from "@allonfire/config/local/addresses";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import SignedInLayout from "../[locale]/(signed-in)/layout";

// The frame reads the Session in three places, each behind its own Suspense
// in the real layout; the contract here is only how the layout binds the frame.
vi.mock("@allonfire/ui/features/navigation/components/aof-account", () => ({
  AOFAccount: () => null,
  AOFAccountPlaceholder: () => null,
}));
vi.mock(
  "@allonfire/ui/features/navigation/components/aof-app-switcher",
  () => ({
    AOFAppSwitcher: () => <i data-switcher />,
    AOFCurrentApp: () => <i data-current-app />,
  })
);
vi.mock(
  "@allonfire/ui/features/navigation/components/aof-sign-out-form",
  () => ({ AOFSignOutForm: () => null })
);
vi.mock(
  "@allonfire/ui/features/navigation/components/aof-role-gated-section",
  () => ({ AOFRoleGatedSection: () => null })
);
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("@allonfire/ui/shared/tests/navigation-mock")
);
vi.mock("@/environment/environment", () => ({
  env: { BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE, LAURA_URL: LOCAL.URL.LAURA },
}));

const renderLayout = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={aofMessages("en", EN)}
      timeZone="UTC"
    >
      <SignedInLayout>
        <p>Page</p>
      </SignedInLayout>
    </NextIntlClientProvider>
  );

describe("the signed-in layout", () => {
  it("draws Laura's frame floating, with the sidebar folding to icons", () => {
    const html = renderLayout();
    expect(html).toContain('data-frame-variant="floating"');
    expect(html).toContain('dataset.collapsible = "icon"');
    expect(html).toContain("Page");
  });

  it("has no App switcher: Laura's top button is only its own mark", () => {
    const html = renderLayout();
    expect(html).toContain("data-current-app");
    expect(html).not.toContain("data-switcher");
  });
});
