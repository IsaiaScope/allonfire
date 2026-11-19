// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { sectionHref } from "@allonfire/ui/features/navigation/utils/sections";
import { page } from "vitest/browser";
import { LAURA, SECTION } from "@/shared/constants/laura";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { FrameBreadcrumb } from "../frame-breadcrumb";

/** The address the mocked router reports; a test moves it to navigate. */
const at = { pathname: sectionHref(SECTION.FAVORITES.path) };

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  async () => ({
    aofBaseNavigation: {
      Link: (await import("@allonfire/ui/shared/tests/link-mock")).LinkMock,
      usePathname: () => at.pathname,
    },
  })
);

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

/** The art beside a crumb's name: its aria-hidden picture, never read out. */
const artIn = (crumb: Element | null | undefined) =>
  crumb?.parentElement?.querySelector("span[aria-hidden=true]") ?? null;

const breadcrumb = () =>
  page.getByRole("navigation", {
    exact: true,
    name: enT("Common.Navigation.breadcrumb"),
  });

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("FrameBreadcrumb", () => {
  it("shows Laura, then the Section", async () => {
    at.pathname = sectionHref(SECTION.FAVORITES.path);
    await renderInApp({ children: <FrameBreadcrumb /> });
    await expect
      .element(breadcrumb().getByRole("link", { name: LAURA.name }))
      .toBeVisible();
    await expect
      .element(breadcrumb().getByText(enT("Navigation.favorites")))
      .toBeVisible();
  });

  it("shows the Section and its page under Memory", async () => {
    at.pathname = sectionHref(LAURA.PAGE.LEADERBOARD);
    await renderInApp({ children: <FrameBreadcrumb /> });
    await expect
      .element(breadcrumb().getByText(enT("Navigation.memory")))
      .toBeVisible();
    await expect
      .element(breadcrumb().getByText(enT("Navigation.leaderboard")))
      .toBeVisible();
  });

  it("shows one crumb on Home, the Gallery, with its picture", async () => {
    at.pathname = sectionHref(SECTION.GALLERY.path);
    await renderInApp({ children: <FrameBreadcrumb /> });
    const name = breadcrumb().getByText(enT("Navigation.gallery")).element();
    expect(artIn(name)).not.toBeNull();
    await expect
      .element(breadcrumb().getByText(LAURA.name))
      .not.toBeInTheDocument();
  });

  it("draws the App's picture beside its name too, 28px", async () => {
    at.pathname = sectionHref(SECTION.FAVORITES.path);
    await renderInApp({ children: <FrameBreadcrumb /> });
    const link = breadcrumb().getByRole("link", { name: LAURA.name }).element();
    const art = link.querySelector("span[aria-hidden=true]");
    expect(art?.getBoundingClientRect().width).toBe(28);
  });

  it("draws a picture beside the Section's page, a different one from the Section's", async () => {
    at.pathname = sectionHref(LAURA.PAGE.LEADERBOARD);
    await renderInApp({ children: <FrameBreadcrumb /> });
    const section = artIn(
      breadcrumb().getByText(enT("Navigation.memory")).element()
    );
    const sub = artIn(
      breadcrumb().getByText(enT("Navigation.leaderboard")).element()
    );
    expect(sub).not.toBeNull();
    expect(sub?.outerHTML).not.toBe(section?.outerHTML);
  });
});
