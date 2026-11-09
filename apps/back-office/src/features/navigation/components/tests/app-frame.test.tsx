// @module-tag unit
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SECTIONS } from "../../constants/sections";
import { sectionEntry } from "../../utils/sections";
import { AppFrame } from "../app-frame";

vi.mock("@/features/i18n/navigation", async () => ({
  Link: (await import("@/shared/tests/link-mock")).LinkMock,
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

// Its gutters on a notched screen: its browser test, beside the breadcrumb's.
describe("AppFrame", () => {
  it("names the menu and lists every Section once", () => {
    const html = renderFrame();
    expect(count(html, `aria-label="${EN.Navigation.menu}"`)).toBe(1);
    // A Section with its own pages is reached through the first.
    for (const section of SECTIONS) {
      expect(
        count(html, `href="${sectionEntry(section)}"`)
      ).toBeGreaterThanOrEqual(1);
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
});
