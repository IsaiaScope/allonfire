// @module-tag unit
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { App, Role } from "@allonfire/database/enums";
import { IconHome, IconUpload, IconUsers } from "@tabler/icons-react";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFAppFrame } from "../components/aof-app-frame";
import { AOFRoleGatedSection } from "../components/aof-role-gated-section";
import type { AppDescriptor } from "../types/app-descriptor";

const requireAppSession = vi.hoisted(() => vi.fn());
const headers = vi.hoisted(() => vi.fn());

vi.mock("@allonfire/auth/features/next/utils/session", () => ({
  requireAppSession,
}));
// The App the Session's Role is read for: the one auth is told it serves.
vi.mock("@allonfire/auth/environment/next-environment", () => ({
  nextAuthEnv: { AUTH_APP: "LAURA" },
}));
vi.mock("next/headers", () => ({ cookies: headers, headers }));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const MESSAGES = {
  Navigation: { home: "Home", upload: "Upload", users: "Users" },
};
const HOME = { icon: IconHome, label: "home", path: "" };
const USERS = { icon: IconUsers, label: "users", path: "/users" };
const UPLOAD = {
  icon: IconUpload,
  label: "upload",
  minRole: Role.ADMIN,
  path: "/upload",
};
const APP = {
  app: App.LAURA,
  sections: [HOME, USERS, UPLOAD],
} as const satisfies Pick<AppDescriptor, "app" | "sections">;
const ROW = { current: "CUR", idle: "IDLE" };

const renderFrame = (
  props: { collapsible?: "none"; variant?: "floating" } = {}
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={aofMessages("en", MESSAGES)}
      timeZone="UTC"
    >
      <AOFAppFrame
        account={<span>Account</span>}
        app={APP}
        breadcrumb={<span>Crumb</span>}
        rowClassName={ROW}
        switcher={<span>Apps</span>}
        {...props}
      >
        <p>Page</p>
      </AOFAppFrame>
    </NextIntlClientProvider>
  );

describe("AOFAppFrame", () => {
  it("is shadcn's sidebar with icon collapsing unless told otherwise", () => {
    const html = renderFrame();
    expect(html).toContain('data-frame-variant="sidebar"');
    expect(html).toContain('data-variant="sidebar"');
    expect(html).toContain("Account");
    expect(html).toContain("Apps");
    expect(html).toContain("Crumb");
  });

  it("scrolls the page area at the visible height, so no band shows under it when Safari hides its toolbar", () => {
    const html = renderFrame();
    expect(html).toContain("md:h-dvh");
    expect(html).not.toContain("svh");
  });

  it("takes the variant from the App", () => {
    const html = renderFrame({ variant: "floating" });
    expect(html).toContain('data-frame-variant="floating"');
    expect(html).toContain('data-variant="floating"');
  });

  it("takes the collapsing from the App, the sidebar never folding when it says none", () => {
    expect(renderFrame({ collapsible: "none" })).toContain(
      'dataset.collapsible = "none"'
    );
    expect(renderFrame()).toContain('dataset.collapsible = "icon"');
  });

  it("names the menu once and draws a row for every Section without a minRole", () => {
    const html = renderFrame();
    const { menu } = SHARED_TRANSLATIONS.en.Common.Navigation;
    expect(html.split(`aria-label="${menu}"`)).toHaveLength(2);
    for (const text of [MESSAGES.Navigation.home, MESSAGES.Navigation.users]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(ROW.idle);
  });

  it("is static: it reads no cookie nor header", () => {
    renderFrame();
    expect(headers).not.toHaveBeenCalled();
  });
});

describe("AOFRoleGatedSection", () => {
  const signedInAs = (role: Role) =>
    requireAppSession.mockResolvedValue({
      user: { memberships: [{ app: App.LAURA, role }] },
    });
  const row = async () => {
    const node = await AOFRoleGatedSection({
      children: <li>Upload row</li>,
      section: UPLOAD,
    });
    return node === null ? "" : renderToStaticMarkup(node);
  };

  it("draws its row for a Role that reaches the Section's minRole", async () => {
    signedInAs(Role.ADMIN);
    expect(await row()).toContain("Upload row");
  });

  it("draws nothing for a lower Role", async () => {
    signedInAs(Role.USER);
    expect(await row()).toBe("");
  });

  it("draws nothing, and does not throw, when the Session check refuses", async () => {
    requireAppSession.mockRejectedValue(new Error("redirect /sign-in"));
    expect(await row()).toBe("");
  });
});
