// @module-tag unit
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SECTIONS } from "../../constants/sections";
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
      <AppFrame account={<span>Account</span>}>
        <p>Page</p>
      </AppFrame>
    </NextIntlClientProvider>
  );

const count = (html: string, text: string) => html.split(text).length - 1;

describe("AppFrame", () => {
  it("names both menus and lists every Section in each", () => {
    const html = renderFrame();
    expect(count(html, `aria-label="${EN.Navigation.menu}"`)).toBe(2);
    for (const { label } of SECTIONS) {
      expect(count(html, EN.Navigation[label])).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the page clear of the phone's tab bar", () => {
    expect(renderFrame()).toContain("pb-(--tab-bar-height)");
  });

  it("marks Home current on the root, and only Home", () => {
    expect(count(renderFrame(), 'aria-current="page"')).toBe(2);
  });
});
