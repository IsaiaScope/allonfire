import { useTranslations } from "next-intl";
import { GalleryList } from "@/features/gallery/components/gallery-list";
import { GalleryPage } from "@/features/gallery/components/gallery-page";
import { GALLERY } from "@/features/gallery/constants/gallery";
import { favoritesHydration } from "@/features/gallery/utils/favorites-hydration";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { SECTION } from "@/shared/constants/laura";
import { pageMetadata } from "@/shared/constants/page-information";

export const generateMetadata = () =>
  pageMetadata(SECTION.FAVORITES.path, `Navigation.${SECTION.FAVORITES.label}`);

// The Favorites: the page itself is in the static shell, so a visit paints at
// once; only the photos wait behind the feed's skeleton. The header's
// breadcrumb names the page on screen; the page keeps its h1 for screen
// readers.
const FavoritesPage = () => {
  const t = useTranslations("Navigation");
  return (
    <GalleryPage title={t(SECTION.FAVORITES.label)}>
      <GalleryList
        hydration={favoritesHydration}
        source={GALLERY.SOURCE.FAVORITES}
      />
    </GalleryPage>
  );
};

export default signedInPage(FavoritesPage);
