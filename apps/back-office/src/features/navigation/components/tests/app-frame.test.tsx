// @module-tag unit
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SECTIONS, sectionHref } from "../../constants/sections";
import { AppFrame } from "../app-frame";

vi.mock("@/features/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => "/",
}));

const renderFrame = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={EN}>
      <AppFrame account={<span>Account</span>} switcher={<span>Apps</span>}>
        <p>Page</p>
      </AppFrame>
    </NextIntlClientProvider>
  );

const count = (html: string, text: string) => html.split(text).length - 1;

describe("AppFrame", () => {
  it("names the menu and lists every Section once", () => {
    const html = renderFrame();
    expect(count(html, `aria-label="${EN.Navigation.menu}"`)).toBe(1);
    for (const { path } of SECTIONS) {
      expect(count(html, `href="${sectionHref(path)}"`)).toBeGreaterThanOrEqual(
        1
      );
    }
  });

  it("has the menu button and the breadcrumb", () => {
    const html = renderFrame();
    expect(html).toContain(`aria-label="${EN.Navigation.toggleMenu}"`);
    expect(html).toContain('data-slot="breadcrumb"');
  });

  it("marks Home current on the root, and only Home", () => {
    expect(renderFrame().match(/<a[^>]*aria-current="page"/g)).toHaveLength(1);
  });

  it("keeps the frame clear of the screen's edges at every width", () => {
    const html = renderFrame();
    expect(
      count(html, "pb-[max(--spacing(2),env(safe-area-inset-bottom))]")
    ).toBe(1);
    expect(
      count(html, "max-md:pb-[max(--spacing(2),env(safe-area-inset-bottom))]")
    ).toBe(0);
    expect(
      count(html, "pr-[calc(--spacing(4)+env(safe-area-inset-right,0px))]")
    ).toBe(1);
    expect(count(html, "md:[--gutter-left:var(--page-gutter)]")).toBe(1);
  });
});
