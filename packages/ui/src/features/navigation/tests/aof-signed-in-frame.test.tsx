// @module-tag unit
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { App } from "@allonfire/database/enums";
import { IconHome } from "@tabler/icons-react";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSignedInFrame } from "../components/aof-signed-in-frame";
import type { AppDescriptor } from "../types/app-descriptor";

// The three Session readers are async server components, each behind its own
// `Suspense` in the real frame; the contract here is only how the frame binds
// them, so each draws what it was handed.
vi.mock("../components/aof-account", () => ({
  AOFAccount: ({ seal }: { seal?: (role: "ADMIN") => string }) => (
    <i data-account={seal ? seal("ADMIN") : "no-seal"} />
  ),
  AOFAccountPlaceholder: () => <i data-account-placeholder />,
}));
vi.mock("../components/aof-app-switcher", () => ({
  AOFAppSwitcher: ({ addresses }: { addresses: Record<string, string> }) => (
    <i data-switcher={addresses[App.BACK_OFFICE]} />
  ),
  AOFCurrentApp: () => <i data-current-app />,
}));
vi.mock("../components/aof-sign-out-form", () => ({
  AOFSignOutForm: () => <i data-sign-out-form />,
}));
vi.mock("../components/aof-role-gated-section", () => ({
  AOFRoleGatedSection: () => null,
}));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const APP = {
  app: App.LAURA,
  entries: {
    [App.BACK_OFFICE]: { mark: { icon: IconHome }, name: "Back Office" },
    [App.LAURA]: { mark: { icon: IconHome }, name: "Laura" },
  },
  name: "Laura",
  sections: [{ icon: IconHome, label: "home", path: "" }],
} as const satisfies Pick<
  AppDescriptor,
  "app" | "entries" | "name" | "sections"
>;

const render = (props: Partial<Parameters<typeof AOFSignedInFrame>[0]> = {}) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={aofMessages("en", { Navigation: { home: "Home" } })}
      timeZone="UTC"
    >
      <AOFSignedInFrame
        addresses={{ [App.BACK_OFFICE]: "https://bo.test" }}
        app={APP}
        breadcrumb={<span>Crumb</span>}
        rowClassName={{ current: "CUR", idle: "IDLE" }}
        {...props}
      >
        <p>Page</p>
      </AOFSignedInFrame>
    </NextIntlClientProvider>
  );

describe("AOFSignedInFrame", () => {
  it("holds the sign out form, the account, the switcher and the page", () => {
    const html = render();
    expect(html).toContain("data-sign-out-form");
    expect(html).toContain('data-account="no-seal"');
    expect(html).toContain('data-switcher="https://bo.test"');
    expect(html).toContain("Page");
  });

  it("shows only the App's own mark when it names no other App's address", () => {
    const html = render({ addresses: undefined });
    expect(html).toContain("data-current-app");
    expect(html).not.toContain("data-switcher");
  });

  it("hands the account the App's Role seal", () => {
    expect(render({ seal: (role) => `seal-${role}` })).toContain(
      'data-account="seal-ADMIN"'
    );
  });

  it("passes the Design's frame props through", () => {
    expect(render({ variant: "floating" })).toContain(
      'data-frame-variant="floating"'
    );
  });
});
