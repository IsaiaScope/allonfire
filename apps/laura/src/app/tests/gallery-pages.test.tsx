// @module-tag unit
// @vitest-environment node
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { GALLERY } from "@/features/gallery/constants/gallery";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import FavoritesPage from "../[locale]/(signed-in)/favorites/page";
import GalleryPage from "../[locale]/(signed-in)/page";

const list = vi.hoisted(() => vi.fn());
// The Session check wraps every page in the real build; here, the page itself.
vi.mock("@/features/navigation/utils/signed-in-page", () => ({
  signedInPage: <Page,>(page: Page) => page,
}));
vi.mock("@/features/gallery/components/gallery-list", () => ({
  GalleryList: list,
}));
vi.mock("@/features/gallery/utils/gallery-hydration", () => ({
  galleryHydration: vi.fn(),
}));
vi.mock("@/features/gallery/utils/favorites-hydration", () => ({
  favoritesHydration: vi.fn(),
}));
vi.mock("@/features/gallery/components/gallery-skeleton", () => ({
  GalleryFeedSkeleton: () => <i data-skeleton />,
}));

const draw = (page: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={EN} timeZone="UTC">
      {page}
    </NextIntlClientProvider>
  );

describe.each([
  ["the Gallery", GalleryPage, GALLERY.SOURCE.GALLERY, EN.Navigation.gallery],
  [
    "the Favorites",
    FavoritesPage,
    GALLERY.SOURCE.FAVORITES,
    EN.Navigation.favorites,
  ],
] as const)("%s page", (_name, Page, source, title) => {
  it("keeps its name for screen readers and reads its own list", () => {
    list.mockImplementation(({ source: read }: { source: string }) => (
      <i data-source={read} />
    ));
    const html = draw(<Page />);
    expect(html).toContain(`<h1 class="sr-only">${title}</h1>`);
    expect(html).toContain(`data-source="${source}"`);
  });

  it("shows the skeleton while the list is read", () => {
    list.mockImplementation(() => {
      throw new Promise(() => undefined);
    });
    expect(draw(<Page />)).toContain("data-skeleton");
  });
});
