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

  it("shows one crumb on Home, the Gallery", async () => {
    at.pathname = sectionHref(SECTION.GALLERY.path);
    await renderInApp({ children: <FrameBreadcrumb /> });
    await expect
      .element(breadcrumb().getByText(enT("Navigation.gallery")))
      .toBeVisible();
    await expect
      .element(breadcrumb().getByText(LAURA.name))
      .not.toBeInTheDocument();
  });
});
